console.log("🔑 NOTION_SECRET length:", process.env.NOTION_SECRET?.length);
console.log("🗄 TARGET_DB_ID:", process.env.TARGET_DB_ID);

// upload-today.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const sendMail = require("./lib/sendMail");

const fetch =
  typeof global.fetch === "function"
    ? global.fetch
    : (...args) =>
        import("node-fetch").then(({ default: f }) => f(...args));

const NOTION_SECRET = process.env.NOTION_SECRET;
const TARGET_DB_ID = process.env.TARGET_DB_ID;
const NOTION_VERSION = "2022-06-28";

/**
 * 🇰🇷 KST 기준 오늘 날짜 (YYYY-MM-DD)
 * GitHub Actions UTC 환경에서도 정확
 */
function todayKST() {
  const kst = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  );

  const y = kst.getFullYear();
  const m = String(kst.getMonth() + 1).padStart(2, "0");
  const d = String(kst.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

/**
 * 노션 페이지 생성
 */
async function createPage(word) {
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_SECRET}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      parent: { database_id: TARGET_DB_ID },
      properties: {
        "뜻 (클릭하면 설명)": {
          title: [{ text: { content: word.word } }]
        },
        "어휘": {
          rich_text: [{ text: { content: word.word } }]
        },
        "예문": {
          rich_text: [{ text: { content: word.example } }]
        },
        "예문 해석": {
          rich_text: [{ text: { content: word.example_translation } }]
        },
        "추가일": {
          date: { start: todayKST() }
        },
        "선택": {
          select: { name: "공개" }
        },
        "목표일": word.targetDate
          ? { date: { start: word.targetDate } }
          : undefined
      },
      children: [
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: word.example } }]
          }
        }
      ]
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API error: ${text}`);
  }
}

/**
 * 메인 실행
 */
async function run() {
  const today = todayKST();
  console.log("📅 KST 오늘 날짜:", today);

  const dir = path.join(__dirname, "words");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // ✅ 조건 필터
    if (data.published) continue;
    if (!data.addedDate) continue;
    if (data.addedDate !== today) continue;

    console.log(`🚀 업로드 시작: ${data.word}`);

    // 1️⃣ 노션 업로드
    await createPage(data);

    // 2️⃣ 메일 발송
    if (sendMail) {
      await sendMail({
        subject: `📘 오늘의 단어 업로드: ${data.word}`,
        text: `
오늘의 단어가 노션에 업로드되었습니다.

단어: ${data.word}
예문: ${data.example}

- YouBuddy 자동화
        `.trim()
      });
    }

    // 3️⃣ published 처리
    data.published = true;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

    console.log(`✅ 완료: ${data.word}`);
  }
}

run().catch(err => {
  console.error("❌ 업로드 실패:", err);
  process.exit(1);
});