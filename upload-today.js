// upload-today.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const fetch =
  typeof global.fetch === "function"
    ? global.fetch
    : (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const NOTION_SECRET = process.env.NOTION_SECRET;
const TARGET_DB_ID = process.env.TARGET_DB_ID;
const NOTION_VERSION = "2022-06-28";

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
  const children = (word.blocks || []).slice(0, 100);

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
    throw new Error(text);
  }
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
    await createPage(data);

    data.published = true;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ 완료: ${data.word}`);
  }
}

run().catch(err => {
  console.error("❌ 업로드 실패:", err);
  process.exit(1);
});