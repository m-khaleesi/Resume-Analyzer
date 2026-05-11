"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Resume = {
  id: string;
  job_role: string;
  score: number;
  feedback: string;
  keywords: string[];
  created_at: string;
};

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/");
        return;
      }

      // Get username from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle();

      setUserEmail(profile?.username || "User");

      // Fetch real resume analyses from resume_up
      const { data: resumeData, error } = await supabase
        .from("resume_up")
        .select("id, job_role, score, feedback, keywords, created_at")
        .eq("user_id", data.user.id)
        .not("feedback", "is", null)
        .order("created_at", { ascending: false });

      if (!error && resumeData) {
        setResumes(resumeData);
      }

      setLoadingResumes(false);
    };

    getUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserEmail("");
    router.replace("/login");
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-400";
    if (score >= 60) return "bg-yellow-400";
    return "bg-red-400";
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">

      {/* NAVBAR */}
      <nav className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <h1 className="text-lg font-bold">Smart Resume Analyzer</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded"
        >
          Logout
        </button>
      </nav>

      <div className="p-8">

        {/* Welcome Banner */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-2">
            Welcome back, {userEmail} 👋
          </h2>
          <p className="text-gray-700 text-sm mb-2">
            A strong resume increases your chances of getting hired and helps
            you stand out from other applicants.
          </p>
          <p className="text-gray-700 text-sm">
            Upload your resume now and get instant feedback to improve your
            chances.
          </p>
        </div>

        {/* Upload Button */}
        <button
          className="bg-gray-900 text-white px-4 py-2 rounded mb-8 hover:bg-gray-700"
          onClick={() => router.push("/upload")}
        >
          Upload New Resume
        </button>

        {/* Resume Cards */}
        {loadingResumes ? (
          <p className="text-center text-gray-500">Loading analyses...</p>
        ) : resumes.length === 0 ? (
          <p className="text-center mt-8 text-gray-500">No analyses yet</p>
        ) : (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {resumes.map((resume) => {
              const keywords: string[] = Array.isArray(resume.keywords)
                ? resume.keywords
                : [];

              return (
                <div
                  key={resume.id}
                  className="bg-white p-5 rounded-lg border shadow space-y-3"
                >
                  {/* Job Role */}
                  <h3 className="font-bold text-base">
                    {resume.job_role}
                  </h3>

                  {/* Date */}
                  <p className="text-xs text-gray-400">
                    {formatDate(resume.created_at)}
                  </p>

                  {/* Score */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Score</span>
                      <span className={`font-bold text-lg ${getScoreColor(resume.score)}`}>
                        {resume.score}%
                      </span>
                    </div>
                    <div className="relative h-3 rounded-full bg-yellow-100">
                      <div
                        className={`absolute h-full rounded-full ${getScoreBg(resume.score)}`}
                        style={{ width: `${resume.score}%` }}
                      />
                    </div>
                  </div>

                  {/* Keywords */}
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {keywords.slice(0, 4).map((kw, i) => {
                        const isMissing = kw.toLowerCase().startsWith("missing:");
                        return (
                          <span
                            key={i}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isMissing
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {kw}
                          </span>
                        );
                      })}
                      {keywords.length > 4 && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
                          +{keywords.length - 4} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Feedback Preview */}
                  <p className="text-xs text-gray-500 line-clamp-3">
                    {resume.feedback}
                  </p>

                  {/* View Details Button */}
                  <button
                    className="w-full bg-gray-900 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700 transition"
                    onClick={() => router.push(`/result?id=${resume.id}`)}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}