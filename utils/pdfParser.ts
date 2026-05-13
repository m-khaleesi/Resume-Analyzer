const pdf = require("pdf-parse");

export async function extractText(buffer: Buffer) {
  const data = await pdf(buffer);
  return data.text;
}