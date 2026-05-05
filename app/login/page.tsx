"use client";

import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const router = useRouter();

  const handleSubmit = async () => {
    setError("");

    if (!email || !password || (!isLogin && !username)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 🔐 LOGIN
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) setError(error.message);
      else router.push("/dashboard");
    }

    // 🆕 REGISTER
    else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      const user = data.user;

      if (!user) {
        setError("User not created yet. Check email confirmation.");
        return;
      }

      const { error: insertError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            username: username,
          },
        ]);

      if (insertError) {
        console.log("PROFILE INSERT ERROR:", insertError);
        setError("Failed to save username.");
        return;
      }

      alert("Registration successful! Check email.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      
      {/* ✅ FORM STARTS HERE */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="bg-white shadow-lg rounded-lg p-8 w-full sm:w-96"
      >
        
        {/* Title */}
        <h1 className="text-2xl text-center font-semibold text-gray-900 mb-6">
          Smart Resume Analyzer
        </h1>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`px-4 py-2 mr-2 rounded-t-lg ${
              isLogin
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`px-4 py-2 rounded-t-lg ${
              !isLogin
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Register
          </button>
        </div>

        {/* Username */}
        {!isLogin && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900">
              Username
            </label>
            <input
              type="text"
              placeholder="Enter your username"
              className="w-full px-3 py-2 mt-1 bg-gray-100 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
        )}

        {/* Email */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900">
            Email
          </label>
          <input
            type="email"
            placeholder="john.doe@example.com"
            className="w-full px-3 py-2 mt-1 bg-gray-100 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900">
            Password
          </label>
          <input
            type="password"
            placeholder="Enter your password"
            className="w-full px-3 py-2 mt-1 bg-gray-100 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Confirm Password */}
        {!isLogin && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm your password"
              className="w-full px-3 py-2 mt-1 bg-gray-100 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}

        {/* ✅ SUBMIT BUTTON (ENTER KEY WORKS HERE) */}
        <button
          type="submit"
          className="w-full px-3 py-2 mt-1 bg-gray-900 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900"
        >
          {isLogin ? "Login" : "Register"}
        </button>

        {/* Error */}
        {error && (
          <p className="text-xs text-center text-red-500 mt-2">{error}</p>
        )}
      </form>
      {/* ✅ FORM ENDS HERE */}

    </div>
  );
}