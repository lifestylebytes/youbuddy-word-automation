// export-from-notion.js
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const fetch =
  typeof global.fetch === "function"
    ? global.fetch
    : (...args) => import("node-fetch").then(({ default: f }) => f(...args));

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
      },
      body: JSON.stringify({
        sorts: [
          {
            property: "추가일",
            direction: "ascending"
          }
        ]
      })
    }
  );

  const data = await res.json();

  const dir = path.join(__dirname, "words");

  // ✅ words 폴더 초기화 (덮어쓰기 보장)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .forEach(f => fs.unlinkSync(path.join(dir, f)));

  let index = 1;

  data.results.forEach(page => {
    const p = page.properties;

    // ✅ 추가일 없으면 export 안 함
    const addedDate = p["추가일"]?.date?.start;
    if (!addedDate) return;

    // ✅ 파일명 기준: 어휘
    const vocab =
      p["어휘"]?.rich_text
        ?.map(t => t.plain_text.trim())
        .find(Boolean) || "";

    if (!vocab) return;

    // ✅ 페이지 title용: 뜻
    const titleText =
      p["뜻 (클릭하면 설명)"]?.title
        ?.map(t => t.plain_text.trim())
        .find(Boolean) || "";

    const json = {
      word: vocab,
      title: titleText,
      example: p["예문"]?.rich_text?.[0]?.plain_text || "",
      example_translation:
        p["예문 해석"]?.rich_text?.[0]?.plain_text || "",
      targetDate: p["목표일"]?.date?.start || "",
      addedDate,
      published: false
    };

    const filename = `${String(index).padStart(2, "0")}_${vocab
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")}.json`;

    fs.writeFileSync(
      path.join(dir, filename),
      JSON.stringify(json, null, 2),
      "utf8"
    );

    index++;
  });

  console.log("✅ SOURCE DB → words 라이브러리 export (추가일 기준 정렬 완료)");
}

run();