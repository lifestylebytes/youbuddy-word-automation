require("dotenv").config();

const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const NOTION_SECRET = process.env.NOTION_SECRET;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

async function inspectDB() {
  const res = await fetch(`${NOTION_API}/databases/${DATABASE_ID}`, {
    headers: {
      Authorization: `Bearer ${NOTION_SECRET}`,
      "Notion-Version": NOTION_VERSION,
    },
  });

  const data = await res.json();

  console.log("📦 DATABASE PROPERTIES\n");
  Object.entries(data.properties).forEach(([name, info]) => {
    console.log(
      `- ${name} → type: ${info.type}`
    );
  });
}

inspectDB();