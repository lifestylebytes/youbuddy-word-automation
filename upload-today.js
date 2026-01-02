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
        }
      }
    })
  });

  const result = await res.json();

  if (!res.ok) {
    console.error("❌ Notion API error:", result);
    throw new Error("Notion page creation failed");
  }

  console.log("✅ Notion page created:", result.id);
}