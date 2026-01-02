function paragraph(text, bold = false) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [
        {
          type: "text",
          text: { content: text },
          annotations: { bold }
        }
      ]
    }
  };
}

function heading(text) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: {
      rich_text: [{ type: "text", text: { content: text } }]
    }
  };
}

function bullet(text) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: text } }]
    }
  };
}

module.exports = function renderBlocks(data) {
  const blocks = [];

  blocks.push(heading(data.word));
  blocks.push(paragraph(data.example));
  blocks.push(paragraph(data.example_translation));

  blocks.push(heading("💡 이 표현이 쓰이는 상황은?"));
  data.situations.forEach(s => {
    blocks.push(bullet(`${s.title}: ${s.description}`));
    s.examples.forEach(ex => blocks.push(bullet(ex)));
  });

  blocks.push(heading("🎯 외우기 쉬운 팁"));
  blocks.push(paragraph(data.tip, true));

  blocks.push(heading("📚 유사 표현"));
  data.synonyms.forEach(s =>
    blocks.push(bullet(`${s.word} - ${s.meaning}`))
  );

  return blocks;
};