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

    // LOGIN
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) setError(error.message);
      else router.push("/dashboard");
    }

    // REGISTER
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
        setError("User not created yet. Register first.");
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

      alert("Registration successful! Go ahead ang login now.");
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/bg.png')",
      }}
    >
      {/* NAVBAR */}
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

          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10">
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="w-full max-w-md bg-gradient-to-b from-white via-indigo-50/70 to-violet-100/60 border border-indigo-200/70 shadow-2xl rounded-3xl overflow-hidden"
        >
          {/* TOP */}
          <div className="px-8 py-7 border-b border-indigo-100">
            <h1 className="text-3xl font-extrabold text-gray-900 text-center">
              {isLogin ? "Welcome Back" : "Create Account"}
            </h1>

            <p className="text-sm text-gray-500 text-center mt-2">
              Smart AI-powered resume analysis
            </p>
          </div>

          {/* CONTENT */}
          <div className="p-8">
            
            {/* TABS */}
            <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isLogin
                    ? "bg-gray-900 text-white hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
                  !isLogin
                    ? "bg-gray-900 text-white hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Register
              </button>
            </div>

            {/* USERNAME */}
            {!isLogin && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Username
                </label>

                <input
                  type="text"
                  placeholder="Enter your username"
                  className="w-full px-4 py-3 bg-white border border-indigo-100 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            )}

            {/* EMAIL */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email
              </label>

              <input
                type="email"
                placeholder="john.doe@example.com"
                className="w-full px-4 py-3 bg-white border border-indigo-100 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* PASSWORD */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                className="w-full px-4 py-3 bg-white border border-indigo-100 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* CONFIRM PASSWORD */}
            {!isLogin && (
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>

                <input
                  type="password"
                  placeholder="Confirm your password"
                  className="w-full px-4 py-3 bg-white border border-indigo-100 text-gray-900 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              className="w-full bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition whitespace-nowrap"            >
              {isLogin ? "Login" : "Register"}
            </button>

            {/* ERROR */}
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <p className="text-sm text-red-600 text-center">
                  {error}
                </p>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}