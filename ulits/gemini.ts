import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeResume(text: string) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a resume analyzer.

Analyze this resume and return:
- strengths
- weaknesses
- missing skills
- job recommendations

Resume:
${text}
`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}