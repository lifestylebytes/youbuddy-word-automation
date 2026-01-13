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

async function fetchJsonOrLog(res, context) {
  const contentType = res.headers.get("content-type") || "";
  const bodyText = await res.text();

  if (!res.ok || !contentType.includes("application/json")) {
    const snippet = bodyText.slice(0, 500);
    console.error(`❌ Notion API 응답 오류 (${context})`);
    console.error(`status: ${res.status} ${res.statusText}`);
    console.error(`content-type: ${contentType || "(없음)"}`);
    console.error(`body(500자): ${snippet}`);
    throw new Error("Notion API returned non-JSON or error status");
  }

  return JSON.parse(bodyText);
}

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
 * 🔹 모든 블록 재귀적으로 가져오기 (nested list 포함)
 */
async function fetchAllBlocks(pageId) {
  let blocks = [];
  let cursor = undefined;

  while (true) {
    const url = new URL(
      `https://api.notion.com/v1/blocks/${pageId}/children`
    );
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url.toString(), {
      method: "GET", // ✅ 반드시 GET
      headers: {
        Authorization: `Bearer ${NOTION_SECRET}`,
        "Notion-Version": NOTION_VERSION
      }
    });

    const data = await fetchJsonOrLog(res, `blocks children: ${pageId}`);
    const results = data.results || [];

    for (const block of results) {
      if (block.has_children) {
        const children = await fetchAllBlocks(block.id);
        if (children.length) {
          block.children = children;
        }
      }
      blocks.push(block);
    }

    if (!data.has_more) break;
    cursor = data.next_cursor;
  }

  return blocks;
}

/**
 * 🔹 rich_text → markdown (링크 포함)
 */
function richTextToMarkdown(richText = []) {
  return richText
    .map(t => {
      if (t.href) {
        return `[${t.plain_text}](${t.href})`;
      }
      return t.plain_text;
    })
    .join("");
}

/**
 * 🔹 block → markdown
 */
function blockToMarkdown(block, indent = 0) {
  const pad = "  ".repeat(indent);
  const type = block.type;
  const text = richTextToMarkdown(block[type]?.rich_text || []).trim();

  if (!text && type !== "divider") return "";

  switch (type) {
    case "paragraph":
      return `${pad}${text}`;

    case "heading_1":
      return `# ${text}`;

    case "heading_2":
      return `## ${text}`;

    case "heading_3":
      return `### ${text}`;

    case "bulleted_list_item":
      return `${pad}- ${text}`;

    case "numbered_list_item":
      return `${pad}1. ${text}`;

    case "quote":
      return `${pad}> ${text}`;

    case "callout":
      return `${pad}> 💡 ${text}`;

    case "divider":
      return `---`;

    default:
      return "";
  }
}

function blocksToMarkdown(blocks = [], indent = 0) {
  const parts = [];

  for (const block of blocks) {
    const isList = block.type.includes("list");
    const blockIndent = isList ? indent + 1 : indent;
    const md = blockToMarkdown(block, blockIndent);
    if (md) parts.push(md);

    if (block.children && block.children.length) {
      const childIndent = isList ? blockIndent + 1 : blockIndent;
      const childMd = blocksToMarkdown(block.children, childIndent);
      if (childMd) parts.push(childMd);
    }
  }

  return parts.join("\n\n");
}

async function run() {
  if (!SOURCE_DB_ID) {
    console.error("❌ SOURCE_DB_ID 없음");
    process.exit(1);
  }
  if (!/^[a-f0-9]{32}$/i.test(SOURCE_DB_ID)) {
    console.error(
      "❌ SOURCE_DB_ID 형식 이상(32자리 hex 필요):",
      SOURCE_DB_ID
    );
  } else {
    console.log(
      "ℹ️ SOURCE_DB_ID:",
      `${SOURCE_DB_ID.slice(0, 6)}...${SOURCE_DB_ID.slice(-4)}`
    );
  }

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

  const data = await fetchJsonOrLog(res, `database query: ${SOURCE_DB_ID}`);
  const dir = path.join(__dirname, "words");

  if (!fs.existsSync(dir)) fs.mkdirSync(dir);
  fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));

  let index = 1;

  console.log("📅 export 기준 날짜:", todayKST());

  for (const page of data.results) {
    const p = page.properties;

    const vocab =
      p["어휘"]?.rich_text?.map(t => t.plain_text).join("").trim();
    if (!vocab) continue;

    const addedDate = p["추가일"]?.date?.start;
    if (!addedDate) continue;

    const title =
      p["뜻 (클릭하면 설명)"]?.title?.map(t => t.plain_text).join("").trim() || "";

    const targetDate = p["목표일"]?.date?.start || "";

    const example =
      p["예문"]?.rich_text?.map(t => t.plain_text).join("").trim() || "";

    const exampleTranslation =
      p["예문 해석"]?.rich_text?.map(t => t.plain_text).join("").trim() || "";

    const blocks = await fetchAllBlocks(page.id);

    const body = blocksToMarkdown(blocks);

    console.log(`📦 export: ${vocab} | blocks: ${blocks.length}`);

    const json = {
      word: vocab,
      title,
      example,
      example_translation: exampleTranslation,
      targetDate,
      addedDate,
      body,        // ✅ 완전한 본문
      blocks,      // 🔒 노션 원본
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

  console.log(`✅ export 완료 — 총 ${index - 1}개`);
}

run().catch(err => {
  console.error("❌ export 실패:", err);
  process.exit(1);
});
