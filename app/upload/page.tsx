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
      setErrorMessage(
        "Only PDF, TXT, DOCX, JPG, PNG, and WEBP files are supported."
      );
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
      // Upload
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

      // Extract Text
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
            (fetchErr instanceof Error
              ? fetchErr.message
              : String(fetchErr))
        );
      }

      const extractData = await extractRes.json();

      if (!extractRes.ok) {
        throw new Error(
          extractData.error ||
            `Extract failed with status ${extractRes.status}`
        );
      }

      const resumeText: string = extractData.text;

      // Analyze
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
            (fetchErr instanceof Error
              ? fetchErr.message
              : String(fetchErr))
        );
      }

      const analyzeData = await analyzeRes.json();

      if (!analyzeRes.ok) {
        throw new Error(
          analyzeData.error ||
            `Analyze failed with status ${analyzeRes.status}`
        );
      }

      const {
        score,
        feedback,
        keywords,
        score_breakdown,
        highlights,
      } = analyzeData as {
        score: number;
        feedback: string;
        keywords: string[];
        score_breakdown: {
          skills_match: number;
          experience: number;
          formatting: number;
          keywords: number;
        };
        highlights: {
          text: string;
          type: string;
          suggestion: string;
        }[];
      };

      // Save
      setStage("saving");

      const { error: dbError } = await supabase
        .from("resume_up")
        .insert({
          user_id: user.id,
          file_url: fileUrl,
          job_role: jobRole,
          score,
          feedback,
          keywords,
          score_breakdown,
          highlights,
        });

      if (dbError) {
        throw new Error(`Database save failed: ${dbError.message}`);
      }

      // Redirect
      setStage("done");

      router.push("/result");
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred.";

      setErrorMessage(message);
      setStage("error");
    }
  };

  const isLoading = [
    "uploading",
    "extracting",
    "analyzing",
    "saving",
    "done",
  ].includes(stage);

  return (
    <div
      className="min-h-screen text-gray-100 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/bg.png')",
      }}
    >
      <header
  className="sticky top-0 z-30 backdrop-blur-md border-b border-white/10 
  bg-gradient-to-r from-[#dbeafe]/90 via-[#eff6ff]/90 to-[#dbeafe]/90"
  >
  <div className="max-w-[1450px] mx-auto px-4 lg:px-6 py-0 flex items-center gap-3 h-14">
    
    {/* LEFT: App title */}
    <div className="flex items-center gap-3 flex-shrink-0">
      <div className="w-1.5 h-6 rounded-full bg-indigo-500" />

      <span className="text-lg font-extrabold tracking-wide bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 bg-clip-text text-transparent font-sans">
        Smart Resume Analyzer
      </span>
    </div>

    {/* CENTER */}
    <div className="flex-1" />

    {/* RIGHT */}
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={() => router.push("/dashboard")}
        className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-700 transition whitespace-nowrap"
      >
        ← Dashboard
      </button>
      </div>
    </div>
</header>

      {/* MAIN */}
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-b from-white via-indigo-50/70 to-violet-100/60 border border-indigo-200/70 shadow-2xl rounded-3xl overflow-hidden">
          {/* TOP */}
          <div className="px-8 py-6 border-b border-indigo-100">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Upload Resume
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              AI-powered resume analyzer
            </p>
          </div>

          {/* CONTENT */}
          <div className="p-8 space-y-7">
            {/* FILE INPUT */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Resume File
              </label>

              <div className="bg-white/80 border border-indigo-100 rounded-2xl p-4 shadow-sm">
                <input
                  type="file"
                  accept=".pdf,.txt,.docx,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  disabled={isLoading}
                  className="block w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-3 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-100 file:text-indigo-700 file:font-semibold cursor-pointer disabled:opacity-50"
                />

                <p className="text-xs text-gray-400 mt-2">
                  PDF, TXT, DOCX, JPG, PNG, WEBP — max 10MB
                </p>

                {file && (
                  <div className="mt-3 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                    <p className="text-xs text-indigo-700 font-medium">
                      Selected: {file.name} (
                      {(file.size / 1024).toFixed(1)} KB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* JOB ROLE */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                Target Job Role
              </label>

              <div className="bg-white/80 border border-violet-100 rounded-2xl p-4 shadow-sm">
                <select
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  disabled={isLoading}
                  className="block w-full text-sm border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
                >
                  <option value="">-- Select a job role --</option>

                  {JOB_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* STATUS */}
            {stage !== "idle" && stage !== "error" && (
              <div className="flex items-center gap-3 bg-white/90 border border-indigo-100 rounded-2xl px-5 py-4 shadow-sm">
                {isLoading && stage !== "done" && (
                  <svg
                    className="animate-spin h-5 w-5 text-indigo-600 flex-shrink-0"
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

                <span className="text-sm font-medium text-gray-700">
                  {stageLabel[stage]}
                </span>
              </div>
            )}

            {/* ERROR */}
            {stage === "error" && errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-4 shadow-sm">
                <p className="text-sm text-red-600 font-medium">
                  ⚠️ {errorMessage}
                </p>
              </div>
            )}

            {/* BUTTON */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
            className="w-full bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition whitespace-nowrap"            >
              {isLoading ? stageLabel[stage] : "Analyze Resume"}
            </button>
          </div>
        </div>

        {/* FOOTER */}
        <div className="mt-6 py-3 flex items-center justify-center">
          <p className="text-[11px] text-gray-300">
            © 2026 Smart Resume Analyzer. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  );
}