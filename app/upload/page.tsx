"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const JOB_ROLES = [
  "Software Engineer",
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Scientist",
  "Data Analyst",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Product Manager",
  "UI/UX Designer",
  "Graphic Designer",
  "Marketing Specialist",
  "Business Analyst",
  "Project Manager",
  "Cybersecurity Analyst",
  "Cloud Engineer",
  "Mobile Developer",
  "QA Engineer",
  "HR Specialist",
  "Sales Representative",
];

type UploadStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "analyzing"
  | "saving"
  | "done"
  | "error";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState<string>("");
  const [stage, setStage] = useState<UploadStage>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const router = useRouter();

  const stageLabel: Record<UploadStage, string> = {
    idle: "",
    uploading: "Uploading resume to storage...",
    extracting: "Extracting text from resume...",
    analyzing: "Analyzing resume with Gemini AI...",
    saving: "Saving results...",
    done: "Done! Redirecting...",
    error: errorMessage,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile(selected);
    setErrorMessage("");
    setStage("idle");
  };

  const handleSubmit = async () => {
    setErrorMessage("");

    if (!file) {
      setErrorMessage("Please select a resume file.");
      setStage("error");
      return;
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
      setErrorMessage("Only PDF, TXT, DOCX, JPG, PNG, and WEBP files are supported.");
      setStage("error");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File size must be under 10MB.");
      setStage("error");
      return;
    }

    if (!jobRole) {
      setErrorMessage("Please select a job role.");
      setStage("error");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    try {
      // --- STEP 1: Upload to Supabase Storage ---
      setStage("uploading");
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("resumes")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;

      // --- STEP 2: Extract Text ---
      setStage("extracting");
      const extractForm = new FormData();
      extractForm.append("file", file);

      let extractRes: Response;
      try {
        extractRes = await fetch("/api/extract-text", {
          method: "POST",
          body: extractForm,
        });
      } catch (fetchErr) {
        throw new Error(
          "Network error calling extract-text: " +
            (fetchErr instanceof Error ? fetchErr.message : String(fetchErr))
        );
      }

      const extractData = await extractRes.json();
      if (!extractRes.ok) {
        throw new Error(extractData.error || `Extract failed with status ${extractRes.status}`);
      }

      const resumeText: string = extractData.text;

      // --- STEP 3: Analyze with Gemini AI ---
      setStage("analyzing");

      let analyzeRes: Response;
      try {
        analyzeRes = await fetch("/api/analyze-resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText, jobRole }),
        });
      } catch (fetchErr) {
        throw new Error(
          "Network error calling analyze-resume: " +
            (fetchErr instanceof Error ? fetchErr.message : String(fetchErr))
        );
      }

      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) {
        throw new Error(analyzeData.error || `Analyze failed with status ${analyzeRes.status}`);
      }

      const { score, feedback, keywords } = analyzeData as {
        score: number;
        feedback: string;
        keywords: string[];
      };

      // --- STEP 4: Save to Supabase ---
      setStage("saving");
      const { error: dbError } = await supabase.from("resume_up").insert({
        user_id: user.id,
        file_url: fileUrl,
        job_role: jobRole,
        score,
        feedback,
        keywords,
      });

      if (dbError) {
        throw new Error(`Database save failed: ${dbError.message}`);
      }

      // --- STEP 5: Redirect ---
      setStage("done");
      router.push("/result");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrorMessage(message);
      setStage("error");
    }
  };

  const isLoading = ["uploading", "extracting", "analyzing", "saving", "done"].includes(stage);

  return (
    <div className="bg-white text-zinc-900 min-h-screen">

      {/* HEADER */}
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">Upload Resume</h1>
        <p className="text-sm text-zinc-500">AI-powered resume analyzer</p>
      </header>

      <div className="max-w-xl mx-auto p-6 space-y-6">

        {/* FILE INPUT */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Resume File{" "}
            <span className="text-zinc-400">(PDF, TXT, DOCX, JPG, PNG — max 10MB)</span>
          </label>
          <input
            type="file"
            accept=".pdf,.txt,.docx,image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={isLoading}
            className="block w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-zinc-100 file:text-sm file:font-medium cursor-pointer disabled:opacity-50"
          />
          {file && (
            <p className="text-xs text-zinc-500">
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        {/* JOB ROLE SELECT */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Target Job Role</label>
          <select
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            disabled={isLoading}
            className="block w-full text-sm border border-zinc-300 rounded-lg px-3 py-2 bg-white disabled:opacity-50"
          >
            <option value="">-- Select a job role --</option>
            {JOB_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* STAGE STATUS */}
        {stage !== "idle" && stage !== "error" && (
          <div className="flex items-center space-x-3 bg-zinc-50 border rounded-lg px-4 py-3">
            {isLoading && stage !== "done" && (
              <svg
                className="animate-spin h-5 w-5 text-zinc-600 flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            )}
            {stage === "done" && <span>✅</span>}
            <span className="text-sm text-zinc-700">{stageLabel[stage]}</span>
          </div>
        )}

        {/* ERROR */}
        {stage === "error" && errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-600">⚠️ {errorMessage}</p>
          </div>
        )}

        {/* SUBMIT BUTTON */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-zinc-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? stageLabel[stage] : "Analyze Resume"}
        </button>
      </div>
    </div>
  );
}