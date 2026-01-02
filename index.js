require("dotenv").config();
const { Client } = require("@notionhq/client");

const loadWords = require("./lib/loadWords");
const pickWord = require("./lib/pickWord");
const renderBlocks = require("./lib/renderBlocks");

const notion = new Client({
  auth: process.env.NOTION_SECRET
});

const DATABASE_ID = process.env.NOTION_DATABASE_ID;

const todayAtMidnight = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split("T")[0];
};

const richText = text => ({
  rich_text: [{ type: "text", text: { content: text } }]
});

async function run() {
  const words = loadWords();
  const data = pickWord(words);
  if (!data) return;

  await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      "뜻 (클릭하면 설명)": {
        title: [{ text: { content: data.word } }]
      },
      "어휘": richText(data.word),
      "예문": richText(data.example),
      "예문 해석": richText(data.example_translation),
      "추가일": { date: { start: todayAtMidnight() } },
      "목표일": { date: { start: data.targetDate } },
      "선택": { select: { name: "word" } },
      "이동완료": { checkbox: false }
    },
    children: renderBlocks(data)
  });

  console.log("✅ 자정 업로드 완료");
}

run();