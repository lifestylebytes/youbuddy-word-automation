require("dotenv").config();

// ✅ fetch는 이것 하나만
const fetch =
  typeof global.fetch === "function"
    ? global.fetch
    : (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const fs = require("fs");
const path = require("path");

const SOURCE_DB_ID = process.env.SOURCE_DB_ID;
const NOTION_SECRET = process.env.NOTION_SECRET;
const NOTION_VERSION = "2022-06-28";

async function run() {
  const res = await fetch(
    `https://api.notion.com/v1/databases/${SOURCE_DB_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_SECRET}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json"
      }
    }
  );

  const data = await res.json();
  const dir = path.join(__dirname, "words");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);

  data.results.forEach((page, i) => {
    const p = page.properties;

    const json = {
      word: p["어휘"].rich_text[0]?.plain_text || "",
      example: p["예문"].rich_text[0]?.plain_text || "",
      example_translation: p["예문 해석"].rich_text[0]?.plain_text || "",
      situations: [],
      tip: "",
      synonyms: [],
      targetDate: p["목표일"]?.date?.start || "",
      published: false
    };

    const safeWord = json.word
  .trim()
  .toLowerCase()
  .replace(/\s+/g, "-")
  .replace(/[^a-z0-9\-]/g, "");

fs.writeFileSync(
  path.join(
    dir,
    `${String(i + 1).padStart(2, "0")}_${safeWord}.json`
  ),
  JSON.stringify(json, null, 2),
  "utf8"
);
  });

  console.log("✅ 기존 DB → 라이브러리 export 완료");
}

run();