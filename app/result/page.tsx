"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

type ResumeResult = {
  score: number;
  feedback: string;
  job_role: string;
  keywords: string[];
};

function ResultContent() {
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchResult = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      let query = supabase
        .from("resume_up")
        .select("*")
        .eq("user_id", user.id);

      if (id) {
        // Load specific result by ID
        query = query.eq("id", id);
      } else {
        // Load latest result
        query = query
          .not("feedback", "is", null)
          .order("created_at", { ascending: false })
          .limit(1);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.log(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setLoading(false);
        return;
      }

      setResult(data);
      setLoading(false);
    };

    fetchResult();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading result...
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        No result found
      </div>
    );
  }

  const keywords: string[] = Array.isArray(result.keywords)
    ? result.keywords
    : [];

  return (
    <div className="bg-white text-zinc-900 min-h-screen">

      {/* HEADER */}
      <header className="p-4 border-b flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analysis Result</h1>
          <p className="text-sm text-zinc-500">AI-powered resume feedback</p>
        </div>
        <button
          className="text-sm text-zinc-500 border px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition"
          onClick={() => router.push("/dashboard")}
        >
          ← Back to Dashboard
        </button>
      </header>

      <div className="flex flex-col md:flex-row">

        {/* LEFT PANEL */}
        <div className="w-full md:w-2/5 p-4">

          {/* SCORE */}
          <div className="bg-white shadow-md rounded-xl p-5 space-y-4">
            <div className="text-4xl font-bold">
              {result.score}%
            </div>
            <div className="relative h-6 rounded-full bg-yellow-300">
              <div
                className="absolute h-full bg-green-400 rounded-full"
                style={{ width: `${result.score}%` }}
              />
            </div>
            <p className="text-sm text-zinc-500">Resume Score</p>
          </div>

          {/* TIP */}
          <div className="bg-white shadow-md rounded-xl p-5 mt-4">
            <div className="flex items-center space-x-2">
              <span>💡</span>
              <span className="text-sm">
                Tailor your resume to the job role: <strong>{result.job_role}</strong>
              </span>
            </div>
          </div>

          {/* KEYWORDS */}
          {keywords.length > 0 && (
            <div className="bg-white shadow-md rounded-xl p-5 mt-4">
              <p className="text-sm font-medium text-zinc-700 mb-3">Keywords</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, index) => {
                  const isMissing = keyword.toLowerCase().startsWith("missing:");
                  return (
                    <span
                      key={index}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isMissing
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {keyword}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* BUTTONS */}
          <div className="mt-4 space-x-4">
            <button
              className="bg-black text-white px-4 py-2 rounded-lg"
              onClick={() => router.push("/dashboard")}
            >
              Save Result
            </button>
            <button
              className="border px-4 py-2 rounded-lg"
              onClick={() => router.push("/upload")}
            >
              Analyze Another Resume
            </button>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full md:w-3/5 p-4">
          <div className="bg-white shadow-md rounded-xl p-6 h-[500px] overflow-y-auto">
            <p className="whitespace-pre-wrap">{result.feedback}</p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading result...
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}