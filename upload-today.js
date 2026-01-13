// upload-today.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const sendMail = require("./lib/sendMail");

const fetch =
  typeof global.fetch === "function"
    ? global.fetch
    : (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const NOTION_SECRET = process.env.NOTION_SECRET;
const TARGET_DB_ID = process.env.TARGET_DB_ID;
const NOTION_VERSION = "2025-09-03";

/**
 * 🇰🇷 KST 기준 오늘 날짜
 */
function todayKST() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 🔹 노션 페이지 생성 (blocks 그대로 재사용)
 */
async function createPage(word) {
  console.log("ℹ️ Notion-Version:", NOTION_VERSION);
  console.log("ℹ️ TARGET_DB_ID:", TARGET_DB_ID);
  const children = (word.blocks || [])
    .slice(0, 100)
    .map(sanitizeBlock)
    .filter(Boolean);

  const properties = {
    "뜻 (클릭하면 설명)": {
      title: [{ text: { content: word.title || word.word } }]
    },
    "어휘": {
      rich_text: [{ text: { content: word.word } }]
    },
    "예문": word.example
      ? { rich_text: [{ text: { content: word.example } }] }
      : undefined,
    "예문 해석": word.example_translation
      ? { rich_text: [{ text: { content: word.example_translation } }] }
      : undefined,
    "추가일": {
      date: { start: word.addedDate }
    },
    "목표일": word.targetDate
      ? { date: { start: word.targetDate } }
      : undefined,
    "선택": {
      select: { name: "word" }   // ❗ word 고정
    }
  };

  // undefined 제거
  Object.keys(properties).forEach(
    key => properties[key] === undefined && delete properties[key]
  );

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_SECRET}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      parent: { database_id: TARGET_DB_ID },
      properties,
      children
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion page create failed: ${text}`);
  }
    // 🔹 생성된 페이지 정보
  const result = await res.json();

  // ✅ 이 URL을 메일 / 로그 / 디버깅에 사용
  return result.url;
}

function sanitizeBlock(block) {
  if (!block || !block.type) return null;

  const type = block.type;
  const content = block[type] || {};
  const cleaned = { object: "block", type };
  const cleanedContent = { ...content };

  if (
    block.children &&
    block.children.length &&
    (type === "bulleted_list_item" || type === "numbered_list_item")
  ) {
    cleanedContent.children = block.children
      .map(sanitizeBlock)
      .filter(Boolean);
  }

  cleaned[type] = cleanedContent;
  return cleaned;
}

/**
 * 🔹 메인
 */
async function run() {
  const today = todayKST();
  console.log("📅 KST 오늘 날짜:", today);

  const dir = path.join(__dirname, "words");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (data.published) continue;
    if (data.addedDate !== today) continue;

    console.log(`🚀 업로드: ${data.word}`);

    // 1️⃣ 페이지 생성
    const pageUrl = await createPage(data);

    // 2️⃣ 메일 전송
    await sendMail({
  subject: `📘 오늘의 단어: ${data.word}`,
  text: `
안녕하세요! 😊
오늘의 단어가 추가되었습니다 👏

Day ${data.day || ""}
${data.word}
${data.example || ""}

👉 노션에서 바로 보기
${pageUrl}

🔗 인증 현황 보기
https://www.notion.so/2db1fc05de1e8048825dc700e2d6d457?source=copy_link




— YouBuddy 자동 단어 시스템 📘
  `.trim()
});


    // 3️⃣ published 처리
    data.published = true;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log(`✅ 완료: ${data.word}`);
  }
}

run().catch(err => {
  console.error("❌ 업로드 실패:", err);
  process.exit(1);
});
