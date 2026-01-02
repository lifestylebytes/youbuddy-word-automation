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

async function fetchBlocks(pageId) {
  const res = await fetch(
    `https://api.notion.com/v1/blocks/${pageId}/children`,
    {
      headers: {
        Authorization: `Bearer ${NOTION_SECRET}`,
        "Notion-Version": NOTION_VERSION
      }
    }
  );
  const data = await res.json();
  return data.results || [];
}

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
        sorts: [{ property: "추가일", direction: "ascending" }]
      })
    }
  );

  const data = await res.json();
  const dir = path.join(__dirname, "words");

  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .forEach(f => fs.unlinkSync(path.join(dir, f)));

  let index = 1;

  for (const page of data.results) {
    const p = page.properties;

    const vocab =
      p["어휘"]?.rich_text?.map(t => t.plain_text).join("").trim() || "";
    if (!vocab) continue;

    const addedDate = p["추가일"]?.date?.start;
    if (!addedDate) continue;

    const blocks = await fetchBlocks(page.id);

    const json = {
      word: vocab,
      addedDate,
      blocks,
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
  }

  console.log("✅ Notion → words export 완료 (본문 포함)");
}

run();