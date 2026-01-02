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
const NOTION_VERSION = "2022-06-28";

// 🇰🇷 KST 기준 오늘 날짜
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
        "목표일": {
          date: { start: word.targetDate }
        }
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
    throw new Error(`Notion 업로드 실패: ${text}`);
  }
}

async function run() {
  const today = todayKST();
  const dir = path.join(__dirname, "words");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));

  const uploadedWords = [];

  for (const file of files) {
    const filePath = path.join(dir, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // ✅ 업로드 조건
    if (data.published) continue;
    if (data.addedDate !== today) continue;

    try {
      console.log(`🚀 업로드: ${data.word}`);
      await createPage(data);

      data.published = true;
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      uploadedWords.push(data.word);
    } catch (err) {
      console.error(`❌ ${data.word} 업로드 실패`, err.message);
    }
  }

  // 📧 메일 발송
  if (uploadedWords.length > 0) {
    await sendMail(
      "📘 오늘의 유버디 단어 업로드 완료",
      `
        <h3>오늘 업로드된 단어</h3>
        <ul>
          ${uploadedWords.map(w => `<li>${w}</li>`).join("")}
        </ul>
        <p>노션에서 확인해보세요 ✨</p>
      `
    );
  } else {
    console.log("ℹ️ 오늘 업로드할 단어 없음");
  }
}

run().catch(err => {
  console.error("🔥 스크립트 전체 실패", err);
  process.exit(1);
});