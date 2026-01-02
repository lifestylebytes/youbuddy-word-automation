/**
 * upload-today.js
 * - words/*.json 라이브러리 기반
 * - targetDate === 오늘(KST) 인 것만 업로드
 * - 업로드 후 published = true
 */

require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Node 18+ / GitHub Actions 대응 fetch
const fetch =
  typeof global.fetch === "function"
    ? global.fetch
    : (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const NOTION_SECRET = process.env.NOTION_SECRET;
const TARGET_DB_ID = process.env.TARGET_DB_ID;
const NOTION_VERSION = "2022-06-28";

if (!NOTION_SECRET || !TARGET_DB_ID) {
  console.error("❌ NOTION_SECRET 또는 TARGET_DB_ID 없음");
  process.exit(1);
}

// 🇰🇷 KST 기준 오늘 날짜 (YYYY-MM-DD)
function todayKST() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

async function createPage(word) {
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_SECRET}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parent: { database_id: TARGET_DB_ID },
      properties: {
        "뜻 (클릭하면 설명)": {
          title: [{ text: { content: word.word } }],
        },
        "어휘": {
          rich_text: [{ text: { content: word.word } }],
        },
        "예문": {
          rich_text: [{ text: { content: word.example } }],
        },
        "예문 해석": {
          rich_text: [{ text: { content: word.example_translation } }],
        },
        "추가일": {
          date: { start: todayKST() },
        },
        "선택": {
          select: { name: "공개" },
        },
        "목표일": {
          date: { start: word.targetDate },
        },
      },
      children: [
        {
          object: "block",
          type: "heading_2",
          heading_2: {
            rich_text: [{ text: { content: word.word } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: word.example } }],
          },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: {
            rich_text: [{ text: { content: word.example_translation } }],
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Notion 업로드 실패: ${t}`);
  }
}

async function run() {
  const today = todayKST();
  const dir = path.join(__dirname, "words");

  if (!fs.existsSync(dir)) {
    console.log("📁 words 폴더 없음 → 종료");
    return;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    if (data.published) continue;
    if (data.targetDate !== today) continue;

    console.log(`🚀 업로드 중: ${data.word}`);
    await createPage(data);

    data.published = true;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }

  console.log("✅ 오늘자 업로드 완료");
}

run().catch(err => {
  console.error("❌ 에러:", err.message);
  process.exit(1);
});