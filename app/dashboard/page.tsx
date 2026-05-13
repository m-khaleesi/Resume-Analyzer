"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

type Resume = {
  id: string;
  job_role: string;
  title: string | null;
  notes: string | null;
  score: number;
  feedback: string;
  keywords: string[];
  file_url: string;
  created_at: string;
};

type UserProfile = {
  id: string;
  username: string;
  email: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white/80 rounded-2xl border border-indigo-100 shadow-sm p-5 space-y-3 animate-pulse">
      <div className="h-4 bg-indigo-100 rounded w-2/3" />
      <div className="h-3 bg-indigo-50 rounded w-1/3" />
      <div className="h-3 bg-indigo-100 rounded-full w-full" />
      <div className="flex gap-1">
        <div className="h-5 w-16 bg-indigo-50 rounded-full" />
        <div className="h-5 w-16 bg-indigo-50 rounded-full" />
      </div>
      <div className="h-3 bg-indigo-50 rounded w-full" />
      <div className="h-3 bg-indigo-50 rounded w-4/5" />
      <div className="h-8 bg-indigo-100 rounded-lg w-full mt-2" />
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  message,
  onConfirm,
  onCancel,
  loading,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Are you sure?</h3>
        <p className="text-sm text-gray-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-600 transition disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Resume Modal ────────────────────────────────────────────────────────

function EditResumeModal({
  resume,
  onSave,
  onClose,
}: {
  resume: Resume;
  onSave: (updated: { job_role: string; title: string; notes: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [jobRole, setJobRole] = useState(resume.job_role);
  const [title, setTitle] = useState(resume.title || "");
  const [notes, setNotes] = useState(resume.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!jobRole.trim()) {
      setError("Job role cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    await onSave({
      job_role: jobRole.trim(),
      title: title.trim(),
      notes: notes.trim(),
    });
    setSaving(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-900">Edit Resume Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 via-white to-violet-50 border border-indigo-100 rounded-xl p-4 mb-5 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            🤖 AI Analysis — Read Only
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">AI Score</span>
            <span className={`font-bold text-base ${getScoreColor(resume.score)}`}>
              {resume.score}%
            </span>
          </div>
          <div className="relative h-2 rounded-full bg-gray-200">
            <div
              className={`absolute h-full rounded-full ${
                resume.score >= 80
                  ? "bg-green-400"
                  : resume.score >= 60
                  ? "bg-yellow-400"
                  : "bg-red-400"
              }`}
              style={{ width: `${resume.score}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 line-clamp-2 pt-1">{resume.feedback}</p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume Title / Label</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='e.g. "Frontend Resume v2", "Senior Dev Application"'
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-xs text-gray-400 mt-1">Give this resume a custom name to organize it better.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Job Role</label>
            <input
              type="text"
              value={jobRole}
              onChange={(e) => setJobRole(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Personal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Add notes, reminders, or tags for this resume..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Private notes only visible to you.</p>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({
  profile,
  onSave,
  onClose,
}: {
  profile: UserProfile;
  onSave: (updated: { username?: string; email?: string; password?: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!username.trim()) { setError("Username cannot be empty."); return; }
    if (password && password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password && password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSaving(true);
    await onSave({ username: username.trim(), email: email.trim(), password: password || undefined });
    setSuccess("Profile updated successfully.");
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          {password && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} disabled={saving} className="flex-1 border border-gray-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition disabled:opacity-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Resume Card ──────────────────────────────────────────────────────────────

function ResumeCard({
  resume,
  onDelete,
  onEdit,
  onView,
}: {
  resume: Resume;
  onDelete: (resume: Resume) => void;
  onEdit: (resume: Resume) => void;
  onView: (resume: Resume) => void;
}) {
  const keywords: string[] = Array.isArray(resume.keywords) ? resume.keywords : [];

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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric",
    });
  };

  return (
    <div className="bg-gradient-to-b from-white via-indigo-50/60 to-violet-100/50 rounded-2xl border border-indigo-200/70 shadow-md hover:shadow-lg transition-shadow p-5 space-y-3 flex flex-col">

      {/* Header */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
            {resume.title || resume.job_role}
          </h3>
          {resume.title && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{resume.job_role}</p>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(resume)}
            title="Edit details"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-white/60 transition"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(resume)}
            title="Delete"
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Date */}
      <p className="text-xs text-gray-400">{formatDate(resume.created_at)}</p>

      {/* Score */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500 flex items-center gap-1">🤖 AI Score</span>
          <span className={`font-bold text-lg ${getScoreColor(resume.score)}`}>{resume.score}%</span>
        </div>
        <div className="relative h-2.5 rounded-full bg-white/70 border border-indigo-100">
          <div
            className={`absolute h-full rounded-full transition-all ${getScoreBg(resume.score)}`}
            style={{ width: `${resume.score}%` }}
          />
        </div>
      </div>

      {/* Keywords */}
      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {keywords.slice(0, 3).map((kw, i) => {
            const isMissing = kw.toLowerCase().startsWith("missing:");
            return (
              <span
                key={i}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  isMissing ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                }`}
              >
                {isMissing ? "✗ " : "✓ "}{isMissing ? kw.replace(/^missing:\s*/i, "") : kw}
              </span>
            );
          })}
          {keywords.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-400 border border-indigo-100">
              +{keywords.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Personal notes preview */}
      {resume.notes && (
        <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-xs text-amber-700 line-clamp-2">📝 {resume.notes}</p>
        </div>
      )}

      {/* Feedback preview */}
      {!resume.notes && (
<p className="text-xs text-indigo-700/80 line-clamp-2 flex-1">
  {resume.feedback}
</p>      )}

      {/* View Button */}
      <button
        onClick={() => onView(resume)}
        className="w-full bg-gray-900 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-700 transition mt-auto"
      >
        View Full Analysis
      </button>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>({ id: "", username: "", email: "" });
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [allResumes, setAllResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterMinScore, setFilterMinScore] = useState("");
  const [filterMaxScore, setFilterMaxScore] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<Resume | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { router.push("/"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", data.user.id)
        .maybeSingle();

      setProfile({
        id: data.user.id,
        username: prof?.username || "User",
        email: data.user.email || "",
      });

      await fetchResumes(data.user.id);
    };
    init();
  }, []);

  const fetchResumes = async (userId: string) => {
    setLoadingResumes(true);
    const { data, error } = await supabase
      .from("resume_up")
      .select("id, job_role, title, notes, score, feedback, keywords, file_url, created_at")
      .eq("user_id", userId)
      .not("feedback", "is", null)
      .order("created_at", { ascending: false });

    if (!error && data) setAllResumes(data);
    setLoadingResumes(false);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredResumes = allResumes.filter((r) => {
    const searchLower = debouncedSearch.toLowerCase();
    const matchesSearch =
      !debouncedSearch ||
      r.job_role.toLowerCase().includes(searchLower) ||
      (r.title || "").toLowerCase().includes(searchLower) ||
      (r.notes || "").toLowerCase().includes(searchLower) ||
      (r.feedback || "").toLowerCase().includes(searchLower);

    const matchesRole =
      !filterRole || r.job_role.toLowerCase().includes(filterRole.toLowerCase());

    const matchesMinScore = !filterMinScore || r.score >= parseInt(filterMinScore);
    const matchesMaxScore = !filterMaxScore || r.score <= parseInt(filterMaxScore);
    const matchesDate = !filterDate || r.created_at?.startsWith(filterDate);

    return matchesSearch && matchesRole && matchesMinScore && matchesMaxScore && matchesDate;
  });

  const totalPages = Math.max(1, Math.ceil(filteredResumes.length / PAGE_SIZE));
  const paginatedResumes = filteredResumes.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const uniqueRoles = Array.from(new Set(allResumes.map((r) => r.job_role))).sort();

  const resetFilters = () => {
    setSearch("");
    setFilterRole("");
    setFilterMinScore("");
    setFilterMaxScore("");
    setFilterDate("");
    setCurrentPage(1);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.file_url) {
        const url = new URL(deleteTarget.file_url);
        const pathParts = url.pathname.split("/storage/v1/object/public/resumes/");
        if (pathParts.length > 1) {
          const storagePath = pathParts[1];
          const { error: storageError } = await supabase.storage
            .from("resumes")
            .remove([storagePath]);
          if (storageError) console.error("Storage delete error:", storageError.message);
        }
      }
      const { error: dbError } = await supabase
        .from("resume_up")
        .delete()
        .eq("id", deleteTarget.id)
        .eq("user_id", profile.id);

      if (dbError) {
        console.error("DB delete error:", dbError.message);
        alert(`Failed to delete: ${dbError.message}`);
        setDeleteLoading(false);
        return;
      }
      setAllResumes((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete error:", err);
      alert("An unexpected error occurred while deleting.");
    }
    setDeleteLoading(false);
  };

  // ── Edit Resume ───────────────────────────────────────────────────────────

  const handleEditSave = async (updated: {
    job_role: string;
    title: string;
    notes: string;
  }) => {
    if (!editTarget) return;
    const { error } = await supabase
      .from("resume_up")
      .update({
        job_role: updated.job_role,
        title: updated.title || null,
        notes: updated.notes || null,
      })
      .eq("id", editTarget.id);

    if (!error) {
      setAllResumes((prev) =>
        prev.map((r) =>
          r.id === editTarget.id
            ? { ...r, job_role: updated.job_role, title: updated.title || null, notes: updated.notes || null }
            : r
        )
      );
    }
    setEditTarget(null);
  };

  // ── Edit Profile ──────────────────────────────────────────────────────────

  const handleProfileSave = async (updated: {
    username?: string;
    email?: string;
    password?: string;
  }) => {
    if (updated.username) {
      await supabase.from("profiles").update({ username: updated.username }).eq("id", profile.id);
      setProfile((prev) => ({ ...prev, username: updated.username! }));
    }
    const authUpdates: { email?: string; password?: string } = {};
    if (updated.email && updated.email !== profile.email) authUpdates.email = updated.email;
    if (updated.password) authUpdates.password = updated.password;
    if (Object.keys(authUpdates).length > 0) {
      await supabase.auth.updateUser(authUpdates);
      if (authUpdates.email) setProfile((prev) => ({ ...prev, email: authUpdates.email! }));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen text-gray-900 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/bg.png')" }}
    >

      {/* NAVBAR — matches result page header */}
      <nav className="sticky top-0 z-40 backdrop-blur-md border-b border-white/10 bg-gradient-to-r from-[#dbeafe]/90 via-[#eff6ff]/90 to-[#dbeafe]/90 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-1.5 h-5 rounded-full bg-indigo-500" />
            <span className="text-lg font-extrabold tracking-wide bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 bg-clip-text text-transparent font-sans">
              Smart Resume Analyzer
            </span>
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setShowProfileDropdown((v) => !v)}
              className="h-9 flex items-center gap-2 bg-white/60 hover:bg-white/80 border border-indigo-100 px-2.5 rounded-xl transition backdrop-blur-sm"
            >
              <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold text-xs">
                {profile.username?.[0]?.toUpperCase() || "U"}
              </div>
              <span className="text-xs font-semibold text-gray-700 hidden sm:block">{profile.username}</span>
              <span className="text-gray-400 text-[10px]">▾</span>
            </button>

            {showProfileDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="font-semibold text-sm">{profile.username}</p>
                  <p className="text-xs text-gray-400 truncate">{profile.email}</p>
                </div>
                <button
                  onClick={() => { setShowEditProfile(true); setShowProfileDropdown(false); }}
                  className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition"
                >
                  ✏️ Edit Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* WELCOME BANNER */}
        <div className="bg-gradient-to-b from-white via-indigo-50/70 to-indigo-100/60 rounded-2xl shadow-md border border-indigo-200/60 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1 text-gray-900">Welcome back, {profile.username} 👋</h2>
            <p className="text-gray-500 text-sm">
              You have {allResumes.length} resume {allResumes.length === 1 ? "analysis" : "analyses"} saved.
            </p>
          </div>
          <button
            onClick={() => router.push("/upload")}
            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition whitespace-nowrap"
          >
            + Upload New Resume
          </button>
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-gradient-to-br from-white via-violet-50/50 to-indigo-100/40 rounded-2xl shadow-md border border-indigo-200/60 p-5 space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by title, job role, notes, or feedback..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-indigo-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80"
            />
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 min-w-[140px]">
              <label className="text-xs font-medium text-gray-500">Job Role</label>
              <select
                value={filterRole}
                onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                className="border border-indigo-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 w-24">
              <label className="text-xs font-medium text-gray-500">Min Score</label>
              <input
                type="number" min={0} max={100} placeholder="0"
                value={filterMinScore}
                onChange={(e) => { setFilterMinScore(e.target.value); setCurrentPage(1); }}
                className="border border-indigo-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80"
              />
            </div>

            <div className="flex flex-col gap-1 w-24">
              <label className="text-xs font-medium text-gray-500">Max Score</label>
              <input
                type="number" min={0} max={100} placeholder="100"
                value={filterMaxScore}
                onChange={(e) => { setFilterMaxScore(e.target.value); setCurrentPage(1); }}
                className="border border-indigo-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Date Uploaded</label>
              <input
                type="date" value={filterDate}
                onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                className="border border-indigo-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white/80"
              />
            </div>

            {(search || filterRole || filterMinScore || filterMaxScore || filterDate) && (
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm text-gray-500 border border-indigo-100 rounded-xl hover:bg-white/60 transition self-end"
              >
                ✕ Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* RESULTS COUNT */}
        {!loadingResumes && (
          <p className="text-sm text-gray-500 px-1">
            Showing {paginatedResumes.length} of {filteredResumes.length} result
            {filteredResumes.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* RESUME CARDS */}
        {loadingResumes ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : paginatedResumes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📄</div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No resumes found</h3>
            <p className="text-sm text-gray-400 mb-6">
              {allResumes.length === 0
                ? "Upload your first resume to get started."
                : "Try adjusting your search or filters."}
            </p>
            {allResumes.length === 0 && (
              <button
                onClick={() => router.push("/upload")}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition"
              >
                Upload Resume
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedResumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                onDelete={setDeleteTarget}
                onEdit={setEditTarget}
                onView={(r) => router.push(`/result?id=${r.id}`)}
              />
            ))}
          </div>
        )}

        {/* PAGINATION */}
        {!loadingResumes && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-indigo-100 rounded-xl text-sm font-medium bg-white/60 hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-9 h-9 rounded-xl text-sm font-medium transition ${
                  currentPage === i + 1
                    ? "bg-gray-900 text-white"
                    : "border border-indigo-100 bg-white/60 hover:bg-white/90 text-gray-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-indigo-100 rounded-xl text-sm font-medium bg-white/60 hover:bg-white/90 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}

        {/* FOOTER */}
        <div className="mt-2 py-2 flex items-center justify-center border-t border-white/20">
          <p className="text-[11px] text-gray-400">© 2026 Smart Resume Analyzer. All rights reserved. Submitted by: Bacas | Cabading | Jaspe | Mapiot</p>
        </div>
      </div>

      {/* MODALS */}
      {deleteTarget && (
        <ConfirmModal
          message={`This will permanently delete "${deleteTarget.title || deleteTarget.job_role}" and its file from storage.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}

      {editTarget && (
        <EditResumeModal
          resume={editTarget}
          onSave={handleEditSave}
          onClose={() => setEditTarget(null)}
        />
      )}

      {showEditProfile && (
        <EditProfileModal
          profile={profile}
          onSave={handleProfileSave}
          onClose={() => setShowEditProfile(false)}
        />
      )}
    </div>
  );
}