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

async function createPage(data) {
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
        "어휘": {
          rich_text: [{ text: { content: data.word } }]
        },
        "추가일": {
          date: { start: todayKST() }
        },
        "선택": {
          select: { name: "공개" }
        }
      },
      children: data.blocks // ✅ 원본 본문 그대로
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API error: ${err}`);
  }
}

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

    console.log("🚀 업로드 시작:", data.word);

    await createPage(data);

    await sendMail({
      subject: `📘 오늘의 유버디 단어: ${data.word}`,
      text: `${data.word} 단어가 노션에 업로드되었습니다.`
    });

    data.published = true;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    console.log("✅ 완료:", data.word);
  }
}

run();