const fs = require("fs");
const path = require("path");

module.exports = function loadWords() {
  const dir = path.join(__dirname, "..", "words");

  return fs.readdirSync(dir)
    .filter(f => f.endsWith(".json"))
    .map(file => {
      const full = path.join(dir, file);
      return JSON.parse(fs.readFileSync(full, "utf8"));
    });
};