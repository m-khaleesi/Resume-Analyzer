"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !jobRole) {
      alert("Please upload a file and enter a job role.");
      return;
    }

    try {
      // 🔹 Create unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // 🔹 Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("resumes") // bucket name
        .upload(filePath, file);

      if (uploadError) {
        console.log(uploadError.message);
        alert("Upload failed");
        return;
      }

      // 🔹 Get public URL
      const { data } = supabase.storage
        .from("resumes")
        .getPublicUrl(filePath);

      const fileUrl = data.publicUrl;

      // 🔐 Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User not found");
        return;
      }

      // 🔹 Save to your table (resume_up)
      const { error: insertError } = await supabase
        .from("resume_up") // ✅ your table name
        .insert([
          {
            user_id: user.id,
            file_url: fileUrl,
            job_role: jobRole,
            score: Math.floor(Math.random() * 30) + 70, // fake score
          },
        ]);

      if (insertError) {
        console.log(insertError.message);
        alert("Failed to save data");
        return;
      }

      alert("Resume uploaded successfully!");

      // 🔹 Redirect back to dashboard
      router.push("/dashboard");

    } catch (err) {
      console.log(err);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card w-full max-w-md p-8 rounded-lg shadow-lg">
        
        <h1 className="text-2xl font-bold text-primary text-center mb-6">
          Upload Resume
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Upload Area */}
          <div className="flex items-center justify-center bg-input border-dashed border-2 border-primary rounded-lg py-8 px-4">
            <label className="cursor-pointer text-center">
              
              <div className="flex flex-col items-center">
                <div className="text-4xl mb-2">📄</div>

                <span className="text-primary text-sm">
                  Drag and drop your resume here or
                </span>

                <span className="text-primary underline text-sm">
                  browse
                </span>
              </div>

              <input
                type="file"
                accept=".pdf,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {/* File Name */}
          {file && (
            <p className="text-sm text-primary">
              Selected file: {file.name}
            </p>
          )}

          <div className="text-primary text-sm">
            Accepted file types: PDF, TXT
          </div>

          {/* Job Role */}
          <div>
            <label className="block text-primary">Job Role</label>
            <input
              type="text"
              placeholder="Enter your job role"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="w-full bg-input text-primary border-b-2 border-primary focus:outline-none py-1"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg hover:opacity-80"
          >
            Analyze Resume
          </button>
        </form>

        <p className="text-center text-sm text-muted mt-4">
          Your resume will be analyzed using AI
        </p>
      </div>
    </div>
  );
}