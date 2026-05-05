"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Resume = {
  id: number;
  role: string;
  score: number;
  date: string;
};

export default function Dashboard() {
  const [userEmail, setUserEmail] = useState("");
  const [resumes, setResumes] = useState<Resume[]>([]);
  const router = useRouter();

  // 🔐 Get logged-in user
  useEffect(() => {
    const getUser = async () => {
        const { data } = await supabase.auth.getUser();
            console.log("USER:", data.user); // 👈 ADD HERE

        
        if (!data.user) {
            router.push("/");
        } else {
            const { data: profile, error } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", data.user.id)
            .maybeSingle();

                console.log("PROFILE:", profile); // 👈 ADD HERE

            setUserEmail(profile?.username || "User");
        }
    };

    getUser();

    // TEMP fake data (replace later with DB)
    setResumes([
      { id: 1, role: "Software Developer", score: 85, date: "2026-01-15" },
      { id: 2, role: "Data Analyst", score: 92, date: "2026-01-10" },
      { id: 3, role: "UX Designer", score: 78, date: "2026-01-05" },
    ]);
  }, []);

  // 🚪 Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();

    // optional: clear state (good practice)
    setUserEmail("");

    // redirect to login page
    router.replace("/login"); // use replace instead of push
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
      
      {/* ✅ NEW: Welcome + Motivation Banner */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-bold mb-2">
          Welcome back, {userEmail} 👋
        </h2>

        <p className="text-gray-700 text-sm mb-2">
          A strong resume increases your chances of getting hired and helps you
          stand out from other applicants.
        </p>

        <p className="text-gray-700 text-sm">
          Upload your resume now and get instant feedback to improve your chances.
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
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumes.map((resume) => (
          <div
            key={resume.id}
            className="bg-white p-4 rounded border shadow"
          >
            <h3 className="font-bold">
              Job Role: {resume.role}
            </h3>
            <p>Score: {resume.score}/100</p>
            <p>Date: {resume.date}</p>

            <button
              className="bg-gray-200 px-3 py-1 rounded mt-2 hover:bg-gray-300"
              onClick={() => alert(`Viewing ${resume.role}`)}
            >
              View Details
            </button>
          </div>
        ))}
      </section>

      {/* Empty State */}
      {resumes.length === 0 && (
        <p className="text-center mt-8 text-gray-500">
          No analyses yet
        </p>
      )}
    </div>
  </div>
);
}