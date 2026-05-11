import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import { extractText } from "unpdf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "text/plain",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload a PDF, TXT, DOCX, JPG, or PNG." },
        { status: 400 }
      );
    }

    let text = "";

    // --- TXT ---
    if (file.type === "text/plain") {
      text = await file.text();
    }

    // --- PDF ---
    else if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);
      const { text: extracted } = await extractText(buffer, { mergePages: true });
      text = extracted;
    }

    // --- DOCX ---
    else if (
      file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }

    // --- IMAGE (JPG, PNG, WEBP) ---
    else if (
      file.type === "image/jpeg" ||
      file.type === "image/png" ||
      file.type === "image/webp"
    ) {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const IMAGE_MODELS = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
      ];

      let ocrText = "";
      let lastOcrError: Error | null = null;

      for (const modelName of IMAGE_MODELS) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        inline_data: {
                          mime_type: file.type,
                          data: base64,
                        },
                      },
                      {
                        text: "This is a resume image. Extract ALL text from it exactly as it appears. Return only the extracted text, no commentary.",
                      },
                    ],
                  },
                ],
              }),
            }
          );

          const geminiData = await geminiRes.json();

          if (!geminiRes.ok) {
            const errMsg = geminiData.error?.message || "Unknown error";
            if (
              errMsg.includes("429") ||
              errMsg.includes("503") ||
              errMsg.includes("404") ||
              errMsg.includes("quota") ||
              geminiRes.status === 429 ||
              geminiRes.status === 503 ||
              geminiRes.status === 404
            ) {
              lastOcrError = new Error(errMsg);
              continue;
            }
            throw new Error(errMsg);
          }

          ocrText =
            geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          break;
        } catch (err: unknown) {
          lastOcrError = err instanceof Error ? err : new Error(String(err));
          if (
            lastOcrError.message.includes("429") ||
            lastOcrError.message.includes("503") ||
            lastOcrError.message.includes("404") ||
            lastOcrError.message.includes("quota")
          ) {
            continue;
          }
          throw lastOcrError;
        }
      }

      if (!ocrText && lastOcrError) {
        throw new Error(
          "All models quota exceeded for image OCR: " + lastOcrError.message
        );
      }

      text = ocrText;
    }

    if (!text || text.trim().length < 30) {
      return NextResponse.json(
        {
          error:
            "Could not extract sufficient text from the file. If uploading an image, make sure it contains readable text.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({ text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}