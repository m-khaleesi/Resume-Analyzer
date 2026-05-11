import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const { resumeText, jobRole } = await req.json();

    if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length === 0) {
      return NextResponse.json({ error: "Resume text is required." }, { status: 400 });
    }

    if (!jobRole || typeof jobRole !== "string") {
      return NextResponse.json({ error: "Job role is required." }, { status: 400 });
    }

    const prompt = `
You are an expert resume reviewer and ATS optimization specialist.

Analyze the following resume for the job role: "${jobRole}".

Evaluate the resume on the following criteria:
1. Grammar and spelling
2. Readability and clarity
3. Resume structure and formatting
4. Professionalism and tone
5. Keyword optimization for the role
6. Relevance to the selected job role: "${jobRole}"
7. Missing important sections (e.g., Summary, Skills, Experience, Education, Certifications)
8. ATS-friendliness
9. Strengths and weaknesses

Return ONLY a valid JSON object (no markdown, no backticks, no explanation) in this exact format:
{
  "score": <number between 0 and 100>,
  "feedback": "<detailed multiline feedback as a single string including: Resume Strengths, Resume Weaknesses, Grammar Issues, ATS Optimization Suggestions, Formatting Improvements, and Role-Specific Suggestions>",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8"]
}

The "keywords" array should contain 6-10 important keywords that are either:
- Present in the resume and relevant to the ${jobRole} role
- Missing from the resume but critical for the ${jobRole} role (prefix these with "Missing: ")

Resume Content:
"""
${resumeText.slice(0, 12000)}
"""
`;

    const MODELS = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
    ];

    let lastError: Error | null = null;

    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const rawText = response.text();

        let parsed: { score: number; feedback: string; keywords: string[] };

        try {
          const cleaned = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          parsed = JSON.parse(cleaned);
        } catch {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("Failed to parse AI response.");
          parsed = JSON.parse(jsonMatch[0]);
        }

        if (typeof parsed.score !== "number" || typeof parsed.feedback !== "string") {
          throw new Error("AI returned invalid structure.");
        }

        const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : [];

        return NextResponse.json({
          score: Math.min(100, Math.max(0, Math.round(parsed.score))),
          feedback: parsed.feedback,
          keywords,
        });
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (
          !lastError.message.includes("429") &&
          !lastError.message.includes("503") &&
          !lastError.message.includes("404")
        ) {
          return NextResponse.json({ error: lastError.message }, { status: 500 });
        }
        continue;
      }
    }

    return NextResponse.json(
      { error: "All models quota exceeded. Please try again later. " + lastError?.message },
      { status: 429 }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}