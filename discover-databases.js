require("dotenv").config();
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const NOTION_SECRET = process.env.NOTION_SECRET;

if (!NOTION_SECRET) {
  console.error("❌ NOTION_SECRET 없음");
  process.exit(1);
}

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

async function discoverDatabases() {
  console.log("📡 접근 가능한 데이터베이스 검색 중...");

  const res = await fetch(`${NOTION_API}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_SECRET}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filter: {
        property: "object",
        value: "database",
      },
    }),
  });

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    console.log("⚠️ 접근 가능한 DB 없음");
    return;
  }

  data.results.forEach((db, i) => {
    const title = (db.title || [])
      .map(t => t.plain_text)
      .join("") || "(제목 없음)";

    console.log(`
#${i + 1}
제목: ${title}
표시용 ID: ${db.id}
ENV용 ID: ${db.id.replace(/-/g, "")}
---------------------------
`);
  });
}

discoverDatabases();