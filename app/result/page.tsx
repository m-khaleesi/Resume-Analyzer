"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreBreakdown = {
  skills_match: number;
  experience: number;
  formatting: number;
  keywords: number;
};

type GrammarIssue = {
  error: string;
  correction: string;
  explanation: string;
};

type StructuredFeedback = {
  strengths: string[];
  weaknesses: string[];
  grammar_issues: GrammarIssue[];
  ats_suggestions: string[];
  formatting_improvements: string[];
  role_suggestions: string[];
};

type Highlight = {
  text: string;
  type: "weak_wording" | "missing_skill" | "poor_formatting" | "no_achievement";
  suggestion: string;
};

type ResumeResult = {
  id: string;
  score: number;
  score_breakdown: ScoreBreakdown | null;
  feedback: string;
  job_role: string;
  keywords: string[];
  file_url: string;
  title: string | null;
  highlights: Highlight[] | null;
};

type ActiveView = "analysis" | "resume";
type FeedbackTab = "strengths" | "weaknesses" | "grammar" | "ats" | "formatting" | "role";

type HighlightStyle = {
  bg: string;
  border: string;
  activeBorder: string;
  label: string;
  dot: string;
  gradientFrom: string;
  gradientTo: string;
};

const HIGHLIGHT_STYLES: Record<string, HighlightStyle> = {
  weak_wording: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    activeBorder: "border-amber-400 ring-2 ring-amber-200",
    label: "Weak Wording",
    dot: "bg-amber-400",
    gradientFrom: "from-amber-50",
    gradientTo: "to-yellow-50",
  },
  missing_skill: {
    bg: "bg-red-50",
    border: "border-red-200",
    activeBorder: "border-red-400 ring-2 ring-red-200",
    label: "Missing Skill",
    dot: "bg-red-400",
    gradientFrom: "from-red-50",
    gradientTo: "to-rose-50",
  },
  poor_formatting: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    activeBorder: "border-blue-400 ring-2 ring-blue-200",
    label: "Poor Formatting",
    dot: "bg-blue-400",
    gradientFrom: "from-blue-50",
    gradientTo: "to-sky-50",
  },
  no_achievement: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    activeBorder: "border-orange-400 ring-2 ring-orange-200",
    label: "No Achievement",
    dot: "bg-orange-400",
    gradientFrom: "from-orange-50",
    gradientTo: "to-amber-50",
  },
};

// --- Feedback Parser ---

function parseFeedback(raw: string): StructuredFeedback {
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      grammar_issues: Array.isArray(parsed.grammar_issues) ? parsed.grammar_issues : [],
      ats_suggestions: Array.isArray(parsed.ats_suggestions) ? parsed.ats_suggestions : [],
      formatting_improvements: Array.isArray(parsed.formatting_improvements) ? parsed.formatting_improvements : [],
      role_suggestions: Array.isArray(parsed.role_suggestions) ? parsed.role_suggestions : [],
    };
  } catch {
    return {
      strengths: [],
      weaknesses: raw ? [raw] : [],
      grammar_issues: [],
      ats_suggestions: [],
      formatting_improvements: [],
      role_suggestions: [],
    };
  }
}

// --- Circular Score ---

function CircularScore({ score }: { score: number }) {
  const [animated, setAnimated] = useState(0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animated / 100) * circumference;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work";
  const labelBg = score >= 80 ? "bg-green-100 text-green-700" : score >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-gray-900 leading-none">{animated}</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">Score</span>
        </div>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${labelBg}`}>{label}</span>
    </div>
  );
}

// --- Score Bar ---

function ScoreBar({ label, value, color, delay = 0 }: { label: string; value: number; color: string; delay?: number }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(value), 300 + delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-900">{value}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${width}%`, background: color, transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>
    </div>
  );
}

// --- Feedback Tabs ---

function FeedbackTabs({ feedback }: { feedback: StructuredFeedback }) {
  const [activeTab, setActiveTab] = useState<FeedbackTab>("strengths");

  const tabs: { id: FeedbackTab; label: string; count: number; activeClass: string; icon: string }[] = [
    { id: "strengths",  label: "Strengths",  count: feedback.strengths.length,              activeClass: "bg-emerald-500 text-white shadow-sm", icon: "✓" },
    { id: "weaknesses", label: "Weakness", count: feedback.weaknesses.length,             activeClass: "bg-red-500 text-white shadow-sm",     icon: "✗" },
    { id: "grammar",    label: "Grammar",    count: feedback.grammar_issues.length,          activeClass: "bg-violet-500 text-white shadow-sm",  icon: "G" },
    { id: "ats",        label: "ATS",        count: feedback.ats_suggestions.length,         activeClass: "bg-blue-500 text-white shadow-sm",    icon: "A" },
    { id: "formatting", label: "Format",     count: feedback.formatting_improvements.length, activeClass: "bg-orange-500 text-white shadow-sm",  icon: "F" },
    { id: "role",       label: "Role Fit",   count: feedback.role_suggestions.length,        activeClass: "bg-indigo-500 text-white shadow-sm",  icon: "R" },
  ];

  const activeTabConfig = tabs.find((t) => t.id === activeTab)!;

  return (
<div className="bg-gradient-to-b from-white via-indigo-50/70 to-violet-100/60 border border-indigo-200/70 shadow-md rounded-2xl border border-indigo-100 shadow-sm flex flex-col h-full overflow-hidden">      <div className="p-3 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-semibold transition-all duration-200 whitespace-nowrap",
                  isActive ? tab.activeClass : "text-gray-500 hover:text-gray-800 hover:bg-white/40",
                ].join(" ")}
              >
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-[10px] font-bold">{tab.icon}</span>
                <span className={["min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1", isActive ? "bg-white/25 text-white" : "bg-gray-200 text-gray-500"].join(" ")}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <p className="sm:hidden mt-1.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {activeTabConfig.label}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 min-h-0 space-y-2">
        {activeTab === "strengths" && (
          feedback.strengths.length === 0 ? <EmptyState message="No strengths detected." /> :
          feedback.strengths.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
            </div>
          ))
        )}
        {activeTab === "weaknesses" && (
          feedback.weaknesses.length === 0 ? <EmptyState message="No weaknesses found. Great resume!" /> :
          feedback.weaknesses.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-red-50 border border-red-100">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-red-500" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </span>
              <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
            </div>
          ))
        )}
        {activeTab === "grammar" && (
          feedback.grammar_issues.length === 0 ? <EmptyState message="No grammar issues found." /> :
          feedback.grammar_issues.map((issue, i) => (
            <div key={i} className="rounded-xl border border-violet-100 bg-violet-50 overflow-hidden">
              <div className="grid grid-cols-2 divide-x divide-violet-100">
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Error</p>
                  <p className="text-xs text-gray-700 font-mono leading-relaxed line-through decoration-red-300">{issue.error}</p>
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Correction</p>
                  <p className="text-xs text-gray-800 font-mono leading-relaxed font-semibold">{issue.correction}</p>
                </div>
              </div>
              <div className="px-3 py-2 border-t border-violet-100">
                <p className="text-[11px] text-gray-500 leading-relaxed">{issue.explanation}</p>
              </div>
            </div>
          ))
        )}
        {activeTab === "ats" && (
          feedback.ats_suggestions.length === 0 ? <EmptyState message="No ATS suggestions." /> :
          feedback.ats_suggestions.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-blue-50 border border-blue-100">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-[10px] font-bold">A</span>
              <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
            </div>
          ))
        )}
        {activeTab === "formatting" && (
          feedback.formatting_improvements.length === 0 ? <EmptyState message="No formatting issues found." /> :
          feedback.formatting_improvements.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-orange-50 border border-orange-100">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 text-orange-600 text-[10px] font-bold">F</span>
              <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
            </div>
          ))
        )}
        {activeTab === "role" && (
          feedback.role_suggestions.length === 0 ? <EmptyState message="No role-specific suggestions." /> :
          feedback.role_suggestions.map((item, i) => (
            <div key={i} className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 text-indigo-600 text-[10px] font-bold">R</span>
              <p className="text-xs text-gray-700 leading-relaxed">{item}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 gap-2">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">✓</div>
      <p className="text-xs text-gray-400 text-center">{message}</p>
    </div>
  );
}

// --- Highlighted Resume Text ---

type Segment = { text: string; highlight: Highlight | null; highlightIndex: number | null };

function buildSegments(text: string, highlights: Highlight[]): Segment[] {
  const segments: Segment[] = [];
  const sorted = highlights
    .map((h, i) => ({ ...h, index: i, pos: text.indexOf(h.text) }))
    .filter((h) => h.pos !== -1)
    .sort((a, b) => a.pos - b.pos);
  let lastPos = 0;
  for (const h of sorted) {
    if (h.pos > lastPos) segments.push({ text: text.slice(lastPos, h.pos), highlight: null, highlightIndex: null });
    segments.push({ text: h.text, highlight: h, highlightIndex: h.index });
    lastPos = h.pos + h.text.length;
  }
  if (lastPos < text.length) segments.push({ text: text.slice(lastPos), highlight: null, highlightIndex: null });
  return segments;
}

function HighlightedResumeText({ text, highlights, activeHighlight, onHighlightClick }: {
  text: string; highlights: Highlight[]; activeHighlight: number | null; onHighlightClick: (i: number) => void;
}) {
  const [openTooltip, setOpenTooltip] = useState<number | null>(null);
  const segments = buildSegments(text, highlights);
  return (
    <div className="text-sm leading-7 text-gray-700 font-mono whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (!seg.highlight || seg.highlightIndex === null) return <span key={i}>{seg.text}</span>;
        const style = HIGHLIGHT_STYLES[seg.highlight.type] ?? HIGHLIGHT_STYLES.weak_wording;
        const isActive = activeHighlight === seg.highlightIndex;
        const showTip = openTooltip === seg.highlightIndex;
        return (
          <span
            key={i}
            className={["relative cursor-pointer rounded px-0.5 border transition-all duration-200", style.bg, isActive ? style.activeBorder : style.border].join(" ")}
            onClick={() => { onHighlightClick(seg.highlightIndex as number); setOpenTooltip(showTip ? null : seg.highlightIndex as number); }}
          >
            {seg.text}
            {showTip && (
              <span className="absolute z-50 bottom-full left-0 mb-2 w-60 bg-gray-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-2xl pointer-events-none">
                <span className="font-semibold block mb-1 text-gray-200">{style.label}</span>
                <span className="text-gray-300 leading-relaxed">{seg.highlight.suggestion}</span>
                <span className="absolute top-full left-5 border-4 border-transparent border-t-gray-900" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

// --- Resume Viewer ---

function ResumeViewer({ fileUrl, highlights, activeHighlight, onHighlightClick }: {
  fileUrl: string; highlights: Highlight[]; activeHighlight: number | null; onHighlightClick: (i: number) => void;
}) {
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const ext = fileUrl.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["jpg", "jpeg", "png", "webp"].includes(ext);
  const isPDF = ext === "pdf";

  useEffect(() => {
    const fetchText = async () => {
      setLoading(true);
      try {
        const res = await fetch(fileUrl);
        if (!res.ok) throw new Error("Failed to fetch file.");
        if (ext === "txt") {
          setExtractedText(await res.text());
        } else if (isImage || ext === "docx" || ext === "doc") {
          const blob = await res.blob();
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
            docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            doc: "application/msword",
          };
          const file = new File([blob], `resume.${ext}`, { type: mimeMap[ext] ?? "application/octet-stream" });
          const form = new FormData();
          form.append("file", file);
          const extractRes = await fetch("/api/extract-text", { method: "POST", body: form });
          const data = await extractRes.json();
          if (!extractRes.ok) throw new Error(data.error ?? "Extraction failed.");
          setExtractedText(data.text);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load.");
      }
      setLoading(false);
    };
    fetchText();
  }, [fileUrl]);

  if (loading) return (
    <div className="space-y-3 animate-pulse p-6">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={`h-3 bg-gray-100 rounded-full ${i % 4 === 0 ? "w-2/5" : i % 3 === 0 ? "w-3/4" : "w-full"}`} />
      ))}
    </div>
  );
  if (error) return <div className="p-6 text-sm text-red-500">⚠️ {error}</div>;
  if (isPDF) return <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full border-0" title="Resume PDF" />;
  if (isImage) return (
    <div className="space-y-4 p-5">
      <img src={fileUrl} alt="Uploaded resume" className="w-full rounded-xl border border-gray-100 object-contain max-h-72" />
      {extractedText && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Extracted Text</p>
          <HighlightedResumeText text={extractedText} highlights={highlights} activeHighlight={activeHighlight} onHighlightClick={onHighlightClick} />
        </div>
      )}
    </div>
  );
  if (extractedText) return (
    <div className="p-6">
      <HighlightedResumeText text={extractedText} highlights={highlights} activeHighlight={activeHighlight} onHighlightClick={onHighlightClick} />
    </div>
  );
  return <div className="p-6 text-sm text-gray-400">Unable to display this file type.</div>;
}

// --- Analysis View ---

function AnalysisView({ result, highlights, activeHighlight, onHighlightClick, feedback, activeView, setActiveView }: {
  result: ResumeResult; highlights: Highlight[]; activeHighlight: number | null;
  onHighlightClick: (i: number) => void; feedback: StructuredFeedback;
  activeView: ActiveView; setActiveView: (v: ActiveView) => void;
}) {
  const breakdown = result.score_breakdown;
  const keywords: string[] = Array.isArray(result.keywords) ? result.keywords : [];

  const scoreItems = breakdown ? [
    { label: "Skills Match", value: breakdown.skills_match, color: "#6366f1" },
    { label: "Experience",   value: breakdown.experience,   color: "#8b5cf6" },
    { label: "Formatting",   value: breakdown.formatting,   color: "#10b981" },
    { label: "Keywords",     value: breakdown.keywords,     color: "#f59e0b" },
  ] : [];

  return (
    <div className="flex flex-col gap-4">

      <div className="grid grid-cols-12 gap-2 items-stretch h-[calc(120vh-140px)]">
      
      {/* LEFT SIDEBAR */}
      <div className="col-span-3 flex flex-col gap-1 h-full min-h-0">          
  
      {/* Score Card */}
          <div className="bg-gradient-to-b from-white via-indigo-50/70 to-indigo-100/60 shadow-md border border-indigo-200/60 rounded-2xl border border-indigo-100 shadow-sm p-5 flex flex-col items-center gap-5 flex-shrink-0">
            <CircularScore score={result.score} />
            {breakdown && scoreItems.length > 0 && (
              <div className="w-full space-y-3 pt-3 border-t border-indigo-100">
                {scoreItems.map((item, i) => (
                  <ScoreBar key={item.label} label={item.label} value={item.value} color={item.color} delay={i * 80} />
                ))}
              </div>
            )}
          </div>

      {/* Target Role */}
          <div className="bg-gradient-to-br from-indigo-100/70 via-white to-violet-100/80 rounded-2xl border border-violet-200 shadow-sm p-4 flex-shrink-0">            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Target Role</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">💼</div>
              <p className="text-sm font-semibold text-gray-800 break-words leading-snug">{result.job_role}</p>
            </div>
          </div>

      {/* Keywords + Legend */}
          <div className="flex gap-3 flex-shrink-0">
            {keywords.length > 0 && (
              <div className="bg-gradient-to-br from-emerald-100/60 via-white to-teal-100/60 rounded-2xl border border-emerald-200 shadow-sm p-4 flex-1 min-w-0 max-h-64 overflow-y-auto">              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Keyword Analysis</p>
                <div className="flex flex-wrap gap-1.5">
                  {keywords.map((kw, i) => {
                    const isMissing = kw.toLowerCase().startsWith("missing:");
                    return (
                      <span key={i} className={["px-2 py-0.5 rounded-full text-[10px] font-semibold", isMissing ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"].join(" ")}>
                        {isMissing ? "✗ " : "✓ "}{isMissing ? kw.replace(/^missing:\s*/i, "") : kw}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {highlights.length > 0 && (
            <div className="bg-gradient-to-br from-amber-100/60 via-white to-orange-100/60 rounded-2xl border border-amber-200 shadow-sm p-4 flex-1 min-w-0 max-h-64 overflow-y-auto">              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Highlight Legend</p>
                <div className="space-y-2">
                  {(Object.entries(HIGHLIGHT_STYLES) as [string, HighlightStyle][]).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${val.dot}`} />
                      <span className="text-xs text-gray-600">{val.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      {/* AI Highlights */}
        <div className="col-span-4 min-h-0 flex flex-col overflow-hidden">
          <div className="bg-gradient-to-b from-white via-amber-50/60 to-yellow-100/50 border border-amber-200/60 shadow-md rounded-2xl border border-amber-100 shadow-sm flex flex-col h-full overflow-hidden">
            <div className="px-5 py-4 border-b border-amber-100 flex items-center justify-between flex-shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Highlights</p>
              <div className="flex items-center bg-gray-100 rounded-xl p-1 h-8">
                {(["analysis", "resume"] as ActiveView[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setActiveView(v)}
                    className={["flex items-center gap-1.5 px-3 h-6 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap", activeView === v ? " text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"].join(" ")}
                  >
                    {v === "analysis" ? "Analysis" : "Resume"}
                    {v === "resume" && highlights.length > 0 && (
                      <span className={["min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold px-1", activeView === v ? "bg-gray-900 text-white" : "bg-gray-300 text-gray-600"].join(" ")}>
                        {highlights.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {highlights.length === 0 ? (
                <EmptyState message="No highlights detected." />
              ) : (
                <div className="space-y-3">
                  {highlights.map((h, i) => {
                    const style = HIGHLIGHT_STYLES[h.type] ?? HIGHLIGHT_STYLES.weak_wording;
                    const isActive = activeHighlight === i;
                    return (
                      <button
                        key={i}
                        onClick={() => onHighlightClick(i)}
                        className={["w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-all duration-200", style.bg, isActive ? style.activeBorder : style.border].join(" ")}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${style.dot}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">{style.label}</p>
                          <p className="text-xs font-semibold text-gray-800 break-words leading-relaxed">&ldquo;{h.text}&rdquo;</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed break-words">{h.suggestion}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Feedback Tabs */}
        <div className="col-span-5 min-h-0 flex flex-col overflow-hidden">
          <FeedbackTabs feedback={feedback} />
        </div>
      </div>

      
      {/* ── FOOTER ── */}
      <div className="mt-2 py-2 flex items-center justify-center border-t border-gray-100">
        <p className="text-[11px] text-gray-400">© 2026 Smart Resume Analyzer. All rights reserved. Submitted by: Bacas | Cabading | Jaspe | Mapiot</p>
      </div>
          </div>
        );
      }

// --- Resume View Panel ---

function ResumeViewPanel({ result, highlights, activeHighlight, onHighlightClick, onSwitchToAnalysis }: {
  result: ResumeResult; highlights: Highlight[]; activeHighlight: number | null;
  onHighlightClick: (i: number) => void; onSwitchToAnalysis: () => void;
}) {
  const ext = result.file_url?.split("?")[0].split(".").pop()?.toLowerCase() ?? "";
  const isPDF = ext === "pdf";
  const activeH = activeHighlight !== null ? highlights[activeHighlight] : null;
  const activeStyle = activeH != null ? (HIGHLIGHT_STYLES[activeH.type] ?? HIGHLIGHT_STYLES.weak_wording) : null;

  return (
    <div className="space-y-4">
      {activeH && activeStyle && (
        <div className={["flex items-start justify-between gap-3 px-4 py-3 rounded-xl border", activeStyle.bg, activeStyle.border].join(" ")}>
          <div className="flex items-start gap-2.5">
            <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${activeStyle.dot}`} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-gray-700">{activeStyle.label}</p>
              <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{activeH.suggestion}</p>
            </div>
          </div>
          <button onClick={onSwitchToAnalysis} className="flex-shrink-0 text-[10px] font-bold text-gray-500 hover:text-gray-800 bg-white/90 backdrop-blur-sm border border-gray-200 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap">
            View all →
          </button>
        </div>
      )}

      <div className={["bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 overflow-hidden", isPDF ? "h-[72vh]" : "max-h-[72vh] overflow-y-auto"].join(" ")}>
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm z-10">
  
  {/* Back button */}
  <button
    onClick={onSwitchToAnalysis}
    className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition flex items-center gap-1"
  >
    ← Back to Analysis
  </button>

  {/* LABEL */}
  <div className="flex items-center gap-2">
    <span className="w-2 h-2 rounded-full bg-green-400" />
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
      Resume Document
    </p>
  </div>

  {/* Open original */}
  <a
    href={result.file_url}
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-gray-400 hover:text-gray-700 transition underline underline-offset-2"
  >
    Open original ↗
  </a>
</div>
        {result.file_url ? (
          <ResumeViewer fileUrl={result.file_url} highlights={highlights} activeHighlight={activeHighlight} onHighlightClick={onHighlightClick} />
        ) : (
          <div className="p-6 text-sm text-gray-400">No file available.</div>
        )}
      </div>

      {highlights.length > 0 && (
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Navigate Highlights</p>
          <div className="flex flex-col gap-1.5">
            {highlights.map((h, i) => {
              const style = HIGHLIGHT_STYLES[h.type] ?? HIGHLIGHT_STYLES.weak_wording;
              const isActive = activeHighlight === i;
              return (
                <button key={i} onClick={() => onHighlightClick(i)} className={["w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border text-xs transition-all", style.bg, isActive ? style.activeBorder : style.border].join(" ")}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />
                  <span className="font-semibold text-gray-600 w-28 flex-shrink-0">{style.label}</span>
                  <span className="text-gray-400 truncate">&ldquo;{h.text}&rdquo;</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Result Content ---

function ResultContent() {
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>("analysis");
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);
  const [profile, setProfile] = useState({ id: "", username: "User", email: "" });
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchResult = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: prof } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
      setProfile({ id: user.id, username: prof?.username || "User", email: user.email || "" });

      let query = supabase.from("resume_up").select("*").eq("user_id", user.id);
      query = id ? query.eq("id", id) : query.not("feedback", "is", null).order("created_at", { ascending: false }).limit(1);
      const { data, error } = await query.maybeSingle();
      if (!error && data) setResult(data);
      setLoading(false);
    };
    fetchResult();
  }, [id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleHighlightClick = (index: number) => {
    setActiveHighlight((prev) => (prev === index ? null : index));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Loading your analysis…</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">📄</div>
        <div className="text-center">
          <p className="text-gray-800 text-lg font-semibold mb-1">No result found</p>
          <p className="text-sm text-gray-400">Upload a resume to get your AI analysis</p>
        </div>
        <button onClick={() => router.push("/upload")} className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-700 transition">Upload a Resume</button>
      </div>
    );
  }

  const highlights: Highlight[] = Array.isArray(result.highlights) ? result.highlights : [];
  const structuredFeedback = parseFeedback(result.feedback);

  return (
    <div
      className="min-h-screen text-gray-100 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/bg.png')",
      }}
    >     
      
      {/* HEADER */}
    <header className="sticky top-0 z-30 backdrop-blur-md border-b border-white/10 
    bg-gradient-to-r from-[#dbeafe]/90 via-[#eff6ff]/90 to-[#dbeafe]/90">        
        <div className="max-w-[1450px] mx-auto px-4 lg:px-6 py-0 flex items-center gap-3 h-14">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-1.5 h-6 rounded-full bg-indigo-500" />

            <span className="text-lg font-extrabold tracking-wide bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-500 bg-clip-text text-transparent font-sans">
              Smart Resume Analyzer
            </span>
          </div>

          {/* CENTER: Job role title */}
          <div className="flex-1 min-w-0 flex items-center justify-center gap-2">
            
          </div>

          {/* RIGHT: Buttons + Profile */}
          <div className="flex items-center gap-2 flex-shrink-0">

            

            {/* New Analysis */}
            <button
              onClick={() => router.push("/upload")}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition whitespace-nowrap"
            >
              New Analysis
            </button>

            {/* Dashboard */}
            <button
              onClick={() => router.push("/dashboard")}
              className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-700 transition whitespace-nowrap"
            >
              ← Dashboard
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown((v) => !v)}
                className="h-9 flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-2.5 rounded-xl transition"
              >
                <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center text-gray-900 font-bold text-xs">
                  {profile.username?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="text-xs font-semibold text-gray-700 hidden sm:block">{profile.username}</span>
                <span className="text-gray-400 text-[10px]">▾</span>
              </button>

              {showDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="font-semibold text-sm">{profile.username}</p>
                    <p className="text-xs text-gray-400 truncate">{profile.email}</p>
                  </div>
                  <button
                    onClick={() => { setShowEditProfile(true); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition"
                  >
                    ✏️ Edit Profile
                  </button>
                  <button
                    onClick={() => { router.push("/dashboard"); setShowDropdown(false); }}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition"
                  >
                    🏠 Dashboard
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
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-[1450px] mx-auto px-4 lg:px-6 py-4">
        {activeView === "analysis" ? (
          <AnalysisView
            result={result}
            highlights={highlights}
            activeHighlight={activeHighlight}
            onHighlightClick={handleHighlightClick}
            feedback={structuredFeedback}
            activeView={activeView}
            setActiveView={setActiveView}
          />
        ) : (
          <ResumeViewPanel
            result={result}
            highlights={highlights}
            activeHighlight={activeHighlight}
            onHighlightClick={handleHighlightClick}
            onSwitchToAnalysis={() => setActiveView("analysis")}
          />
        )}
      </main>
    </div>
  );
}

// --- Page Export ---

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Loading result…</p>
          </div>
        </div>
      }
    >
      <ResultContent />
    </Suspense>
  );
}