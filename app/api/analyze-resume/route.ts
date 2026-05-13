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
You are an expert ATS resume reviewer for ${jobRole} roles.

Analyze the resume below and return ONLY a valid JSON object (no markdown, no backticks, no explanation).

STRICT RULES:
- Every observation goes into ONLY ONE section — no duplicates across sections
- "strengths" = positive qualities only (skills, achievements, strong stack usage)
- "weaknesses" = structural/content problems only (missing sections, vague descriptions, no GitHub/portfolio)
- "grammar_issues" = ONLY spelling/grammar/wording mistakes
- "ats_suggestions" = ONLY keyword and ATS readability improvements
- "formatting_improvements" = ONLY layout, structure, readability issues
- "role_suggestions" = ONLY role-specific improvements for ${jobRole}

Return this exact JSON format:
{
  "score": <number 0-100>,
  "score_breakdown": {
    "skills_match": <number 0-100>,
    "experience": <number 0-100>,
    "formatting": <number 0-100>,
    "keywords": <number 0-100>
  },
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "grammar_issues": [
    {
      "error": "<exact wrong phrase>",
      "correction": "<corrected version>",
      "explanation": "<brief reason>"
    }
  ],
  "ats_suggestions": ["...", "..."],
  "formatting_improvements": ["...", "..."],
  "role_suggestions": ["...", "..."],
  "keywords": ["keyword1", "keyword2"],
  "highlights": [
    {
      "text": "<exact phrase copied verbatim from resume>",
      "type": "weak_wording | missing_skill | poor_formatting | no_achievement",
      "suggestion": "<short improvement tip>"
    }
  ]
}

RULES:
- score_breakdown must reflect the overall score contextually
- highlights: 3–8 exact verbatim phrases from the resume
- keywords: 6–10 items; prefix missing ones with "Missing: "
- Each array must have at least 1 item; if truly none, write ["None"]

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

        let parsed: {
          score: number;
          score_breakdown: {
            skills_match: number;
            experience: number;
            formatting: number;
            keywords: number;
          };
          strengths: string[];
          weaknesses: string[];
          grammar_issues: {
            error: string;
            correction: string;
            explanation: string;
          }[];
          ats_suggestions: string[];
          formatting_improvements: string[];
          role_suggestions: string[];
          keywords: string[];
          highlights: {
            text: string;
            type: string;
            suggestion: string;
          }[];
        };

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

        if (typeof parsed.score !== "number") {
          throw new Error("AI returned invalid structure.");
        }

        // Build a structured feedback JSON string for the `feedback` column
        // so the existing parseFeedback() on the frontend can consume it
        const feedbackPayload = JSON.stringify({
          strengths:               Array.isArray(parsed.strengths) ? parsed.strengths : [],
          weaknesses:              Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
          grammar_issues:          Array.isArray(parsed.grammar_issues) ? parsed.grammar_issues : [],
          ats_suggestions:         Array.isArray(parsed.ats_suggestions) ? parsed.ats_suggestions : [],
          formatting_improvements: Array.isArray(parsed.formatting_improvements) ? parsed.formatting_improvements : [],
          role_suggestions:        Array.isArray(parsed.role_suggestions) ? parsed.role_suggestions : [],
        });

        return NextResponse.json({
          score: Math.min(100, Math.max(0, Math.round(parsed.score))),
          score_breakdown: parsed.score_breakdown ?? {
            skills_match: 0,
            experience: 0,
            formatting: 0,
            keywords: 0,
          },
          feedback:                feedbackPayload,   // ← stored as JSON string in Supabase
          keywords:                Array.isArray(parsed.keywords) ? parsed.keywords : [],
          highlights:              Array.isArray(parsed.highlights) ? parsed.highlights : [],
          ats_suggestions:         Array.isArray(parsed.ats_suggestions) ? parsed.ats_suggestions : [],
          formatting_improvements: Array.isArray(parsed.formatting_improvements) ? parsed.formatting_improvements : [],
          role_suggestions:        Array.isArray(parsed.role_suggestions) ? parsed.role_suggestions : [],
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