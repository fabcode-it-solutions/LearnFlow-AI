import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Zap,
  Flame,
  ChevronRight,
  Sparkles,
  Play,
  Youtube,
  ExternalLink,
  Folder,
  FileText,
  CheckCircle2,
  Clock,
  Target,
  HelpCircle,
  Trash2,
  Terminal,
  FastForward,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import api from "../lib/api";
import FocusRing from "../components/FocusRing";
import EmptyState from "../components/EmptyState";
import FocusPlayerModal from "../components/FocusPlayerModal";
import type { PlanEntry, DashboardSummary, Subject } from "../types";

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [todayEntries, setTodayEntries] = useState<PlanEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Focus Player Modal state
  const [focusModal, setFocusModal] = useState<{
    open: boolean;
    topicTitle: string;
    subjectName: string;
    entryId?: string;
  }>({
    open: false,
    topicTitle: "",
    subjectName: "",
  });

  const fetchData = useCallback(async () => {
    try {
      const [summaryRes, todayRes, subjectsRes] = await Promise.all([
        api.get("/dashboard/summary"),
        api.get("/plan/today"),
        api.get("/subjects"),
      ]);
      setSummary(summaryRes.data.data);
      setTodayEntries(todayRes.data.data.entries);
      setSubjects(subjectsRes.data.data.subjects);
    } catch {
      setError("Failed to load dashboard. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    setError("");
    try {
      await api.post("/plan/generate", {});
      await fetchData();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to generate plan"
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleEntryStatus = async (entryId: string, status: PlanEntry["status"]) => {
    // Optimistic update
    setTodayEntries((prev) =>
      prev.map((e) => (e._id === entryId ? { ...e, status } : e))
    );
    try {
      await api.patch(`/plan/entries/${entryId}`, { status });
      const summaryRes = await api.get("/dashboard/summary");
      setSummary(summaryRes.data.data);
    } catch {
      // Revert if error
      await fetchData();
    }
  };

  const { confirm } = useConfirm();

  const handleRemoveEntry = async (entryId: string, topicTitle?: string) => {
    const confirmed = await confirm({
      title: "Remove from Agenda?",
      message: `Are you sure you want to remove ${topicTitle ? `"${topicTitle}"` : "this task"} from Today's agenda?`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!confirmed) return;

    setTodayEntries((prev) => prev.filter((e) => e._id !== entryId));
    try {
      await api.delete(`/plan/entries/${entryId}`);
      const summaryRes = await api.get("/dashboard/summary");
      setSummary(summaryRes.data.data);
    } catch {
      await fetchData();
    }
  };

  const [pullingNext, setPullingNext] = useState(false);

  const handlePullNext = async () => {
    setPullingNext(true);
    try {
      const res = await api.post("/plan/pull-next");
      const pulled = res.data.data?.pulledEntry;
      if (pulled) {
        toast({
          title: `⚡ "${pulled.topicTitle}" added to Today's Agenda (+25 Bonus XP)!`,
          type: "success",
        });
        await fetchData();
      } else {
        toast({
          title: "All curriculum topics are already scheduled or completed!",
          type: "info",
        });
      }
    } catch (err: unknown) {
      toast({
        title:
          (err as { response?: { data?: { message?: string } } })?.response?.data
            ?.message || "Failed to pull next topic",
        type: "error",
      });
    } finally {
      setPullingNext(false);
    }
  };

  const today = new Date();
  const greeting =
    today.getHours() < 12
      ? "Good morning"
      : today.getHours() < 17
      ? "Good afternoon"
      : "Good evening";

  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Deduplicate Today's tasks by unique topic to prevent misleading duplicate progress
  const uniqueTodayMap = new Map<string, PlanEntry>();
  todayEntries.forEach((e) => {
    const key = e.topicId || e.topicTitle;
    if (!uniqueTodayMap.has(key) || e.status === "done") {
      uniqueTodayMap.set(key, e);
    }
  });
  const uniqueTodayList = Array.from(uniqueTodayMap.values());
  const todayDone = uniqueTodayList.filter((e) => e.status === "done").length;
  const todayTotal = uniqueTodayList.length;
  const todayPct = todayTotal > 0 ? Math.round((todayDone / todayTotal) * 100) : 0;

  // Group subjects by Semester / Learning Track
  const groupedTracks = subjects.reduce<Record<string, Subject[]>>((acc, s) => {
    const track = s.semesterOrTrack || "Core Curriculum";
    if (!acc[track]) acc[track] = [];
    acc[track].push(s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6 md:p-10 w-full animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-64 mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-44 bg-white/5 rounded-2xl" />
            <div className="h-64 bg-white/5 rounded-2xl" />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="h-64 bg-white/5 rounded-2xl" />
            <div className="h-44 bg-white/5 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 w-full pb-24 md:pb-12 text-white">
      {/* ── Top Header Banner ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-ink-60 uppercase tracking-widest mb-1">
            {dateStr}
          </p>
          <h1 className="font-display text-3xl md:text-4xl text-white font-semibold">
            {greeting}, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-xs font-body text-ink-60 mt-1">
            Ready to make progress on your semester syllabus &amp; tech courses today?
          </p>
        </div>

        {/* Action Controls & Streak */}
        <div className="flex items-center gap-3 shrink-0">
          {summary && summary.streak > 0 && (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame size={16} className="text-amber-400 animate-pulse" />
              <span className="font-mono text-sm font-semibold">{summary.streak}</span>
              <span className="text-[11px] font-body text-amber-300/80">day streak</span>
            </div>
          )}

          <button
            onClick={() => window.dispatchEvent(new CustomEvent("open-learnflow-tutorial"))}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 text-xs font-semibold transition-all group"
            title="Open Interactive Tutorial & Product Tour"
          >
            <HelpCircle size={14} className="text-ink-60 group-hover:rotate-12 transition-transform" />
            <span>Interactive Guide</span>
          </button>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            <Zap size={14} />
            <span>{generating ? "Recalculating Plan…" : "Generate AI Plan"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-body">
          {error}
        </div>
      )}

      {/* ── 12-Column Responsive Dashboard Layout ──────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* ── Left Column (8 cols): Today's Learning Agenda & Curriculum ── */}
        <div className="lg:col-span-8 space-y-8">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Overall Progress",
                value: `${summary?.completionPct || 0}%`,
                desc: `${summary?.completedTopics || 0}/${summary?.totalTopics || 0} topics mastered`,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10 border-emerald-500/20",
              },
              {
                label: "Today's Agenda",
                value: `${todayDone}/${todayTotal}`,
                desc: todayTotal > 0 ? `${todayPct}% done` : "0 tasks scheduled",
                color: "text-white",
                bg: "bg-white/5 border-white/10",
              },
              {
                label: "Active Courses",
                value: subjects.length,
                desc: `${Object.keys(groupedTracks).length} learning tracks`,
                color: "text-amber-400",
                bg: "bg-amber-500/10 border-amber-500/20",
              },
            ].map(({ label, value, desc, color }) => (
              <div
                key={label}
                className="bg-[#141414] border border-white/[0.09] rounded-2xl p-4 transition-colors"
              >
                <p className="text-[10px] font-mono text-ink-60 uppercase tracking-widest">
                  {label}
                </p>
                <p className={`font-mono text-2xl font-bold my-0.5 ${color}`}>
                  {value}
                </p>
                <p className="text-[11px] font-body text-ink-60 truncate">{desc}</p>
              </div>
            ))}
          </div>

          {/* Today's Tasks Section */}
          <div className="bg-[#141414] border border-white/[0.09] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Target size={18} className="text-white" />
                <h2 className="font-display text-lg text-white font-semibold">
                  Today's Study Agenda
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePullNext}
                  disabled={pullingNext}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-40"
                  title="Pull the next scheduled topic into today's agenda early (+25 Bonus XP)"
                >
                  <FastForward size={13} className="text-[#0A84FF]" />
                  <span>{pullingNext ? "Pulling…" : "Study Ahead"}</span>
                </button>
                <span className="text-xs font-mono text-ink-60">
                  {todayEntries.reduce((s, e) => s + e.estimatedMinutes, 0)} min allocated
                </span>
              </div>
            </div>

            {/* Early Completion Celebration Card */}
            {todayTotal > 0 && todayDone === todayTotal && (
              <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-emerald-500/5 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      🎉 Today's agenda completed early!
                    </p>
                    <p className="text-xs text-ink-60">
                      Have extra study time? Pull the next topic forward ahead of schedule with bonus XP.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handlePullNext}
                  disabled={pullingNext}
                  className="px-4 py-2 rounded-xl bg-[#0A84FF] hover:opacity-90 active:scale-95 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-[#0A84FF]/20 shrink-0 cursor-pointer disabled:opacity-40"
                >
                  <FastForward size={13} />
                  <span>{pullingNext ? "Pulling Next…" : "Study Ahead (+25 XP)"}</span>
                </button>
              </div>
            )}

            {todayEntries.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                message="No tasks queued for today"
                subMessage="Generate your AI study plan to schedule today's high-yield topics."
                action={
                  <button
                    onClick={handleGeneratePlan}
                    disabled={generating}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 transition-all cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Generate Today's Plan</span>
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                {uniqueTodayList.map((entry) => {
                  const isDone = entry.status === "done";
                  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                    `${entry.subjectName} ${entry.topicTitle} tutorial`
                  )}`;

                  return (
                    <div
                      key={entry._id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border transition-all ${
                        isDone
                          ? "bg-emerald-500/5 border-emerald-500/20 opacity-75"
                          : "bg-white/[0.02] border-white/8 hover:border-white/15"
                      }`}
                    >
                      {/* Left: Checkbox + Subject Tag + Topic Title */}
                      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                        <button
                          onClick={() =>
                            handleEntryStatus(entry._id, isDone ? "pending" : "done")
                          }
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors mt-0.5 sm:mt-0 cursor-pointer ${
                            isDone
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "border-white/20 hover:border-emerald-400"
                          }`}
                        >
                          {isDone && <CheckCircle2 size={14} />}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                              style={{
                                borderColor: entry.subjectColor + "40",
                                color: entry.subjectColor,
                                backgroundColor: entry.subjectColor + "15",
                              }}
                            >
                              {entry.subjectName}
                            </span>
                            {entry.entryType === "coding_lab" || entry.topicTitle.includes("Code Lab") ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 font-semibold">
                                <Terminal size={10} /> Coding Lab
                              </span>
                            ) : entry.entryType === "mock_quiz" || entry.topicTitle.includes("Mock Quiz") ? (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center gap-1 font-semibold">
                                <Sparkles size={10} /> Active Recall
                              </span>
                            ) : null}
                            <span className="text-[11px] font-mono text-ink-60 flex items-center gap-1">
                              <Clock size={11} />
                              {entry.estimatedMinutes}m
                            </span>
                          </div>
                          <p
                            className={`font-body text-sm font-medium truncate ${
                              isDone ? "line-through text-ink-60" : "text-white"
                            }`}
                          >
                            {entry.topicTitle}
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions (Watch Tutorial, Start Focus, Status, Remove) */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* YouTube Search Link */}
                        <a
                          href={youtubeSearchUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-mono transition-colors"
                          title="Search YouTube video tutorials for this topic"
                        >
                          <Youtube size={14} />
                          <span className="hidden sm:inline">Tutorial</span>
                        </a>

                        {/* Focus Session Launcher */}
                        <button
                          onClick={() =>
                            setFocusModal({
                              open: true,
                              topicTitle: entry.topicTitle,
                              subjectName: entry.subjectName,
                              entryId: entry._id,
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 text-xs font-semibold transition-colors cursor-pointer"
                          title="Open Pomodoro Focus Timer with scratchpad"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>Focus</span>
                        </button>

                        {/* Missed Button */}
                        {!isDone && (
                          <button
                            onClick={() => handleEntryStatus(entry._id, "missed")}
                            className="px-2 py-1.5 text-xs font-body text-rose-400/80 hover:text-rose-400 transition-colors cursor-pointer"
                            title="Reschedule to next available day"
                          >
                            Missed
                          </button>
                        )}

                        {/* Remove / Delete Task Button */}
                        <button
                          onClick={() => handleRemoveEntry(entry._id, entry.topicTitle)}
                          className="p-1.5 text-ink-60 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          title="Remove task from plan"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Curriculum Tracks Quick Glance (Reference Structure) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-white font-semibold">
                  Curriculum &amp; Course Tracks
                </h3>
                <p className="text-xs font-body text-ink-60">
                  Organized by semester, bootcamps, and tech stacks.
                </p>
              </div>
              <Link
                to="/subjects"
                className="text-xs font-body text-ink-60 hover:text-white hover:underline flex items-center gap-1"
              >
                Manage all <ChevronRight size={13} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map((sub) => {
                const days = Math.max(
                  Math.ceil((new Date(sub.examDate).getTime() - Date.now()) / 86400000),
                  0
                );
                const completedCount = sub.topics.filter((t) => t.completed).length;
                const pct =
                  sub.topics.length > 0
                    ? Math.round((completedCount / sub.topics.length) * 100)
                    : 0;

                return (
                  <Link
                    key={sub._id}
                    to={`/subjects/${sub._id}`}
                    className="bg-[#141414] border border-white/[0.09] hover:border-white/20 rounded-2xl p-4 transition-all group block"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: sub.colorTag }}
                        />
                        <span className="text-[10px] font-mono text-ink-60 uppercase tracking-wider">
                          {sub.semesterOrTrack || "Core Curriculum"}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-ink-60">{days}d left</span>
                    </div>

                    <h4 className="font-body font-semibold text-white group-hover:text-ink-60 transition-colors truncate">
                      {sub.name}
                    </h4>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] font-mono text-ink-60 mb-1">
                        <span>{completedCount}/{sub.topics.length} topics</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: sub.colorTag }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Right Column (4 cols): Focus Ring, Vault Shortcuts, Notes ── */}
        <div className="lg:col-span-4 space-y-6">
          {/* Focus Ring & Goal Widget */}
          <div className="bg-[#141414] border border-white/[0.09] rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">

            <h3 className="text-[11px] font-mono text-[#8E8E93] uppercase tracking-widest mb-4">
              Today's Completion
            </h3>

            <FocusRing pct={todayPct} size={150} />

            <div className="mt-4">
              <p className="font-mono text-xl font-bold text-white">
                {todayDone} <span className="text-[#8E8E93] text-sm font-normal">of</span> {todayTotal}
              </p>
              <p className="text-xs text-[#8E8E93] mt-0.5">
                Tasks completed today
              </p>
            </div>

            <button
              onClick={() =>
                setFocusModal({
                  open: true,
                  topicTitle: todayEntries[0]?.topicTitle || "Daily Focus Session",
                  subjectName: todayEntries[0]?.subjectName || "Self Study",
                  entryId: todayEntries[0]?._id,
                })
              }
              className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 transition-all cursor-pointer"
            >
              <Play size={14} fill="currentColor" />
              <span>Launch Focus Session</span>
            </button>
          </div>

          {/* Quick Resource Vault (Drive links, PDFs, Playlists) */}
          <div className="bg-[#141414] border border-white/[0.09] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Folder size={16} className="text-amber-400" />
                <h3 className="font-body text-xs font-semibold uppercase tracking-wider text-white">
                  Resource Vault
                </h3>
              </div>
              <Link to="/notes" className="text-[11px] text-ink-60 hover:text-white hover:underline">
                View all
              </Link>
            </div>

            <p className="text-xs text-ink-60 mb-3">
              Fast shortcuts to your documents, syllabus files &amp; learning media.
            </p>

            <div className="space-y-2">
              <Link
                to="/notes"
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 text-xs text-white transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText size={15} className="text-blue-400" />
                  <span className="font-medium group-hover:text-ink-60 transition-colors">
                    Centralized Cloud Notes
                  </span>
                </div>
                <ExternalLink size={12} className="text-ink-60" />
              </Link>

              {subjects.slice(0, 3).map((s) => (
                <Link
                  key={s._id}
                  to={`/subjects/${s._id}`}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/15 text-xs text-white transition-colors group"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.colorTag }}
                    />
                    <span className="truncate group-hover:text-ink-60 transition-colors">
                      {s.name} Materials
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-ink-60 shrink-0" />
                </Link>
              ))}
            </div>
          </div>

          {/* Job Readiness Indicator */}
          <div className="bg-[#141414] border border-white/[0.09] rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono text-ink-60 uppercase tracking-widest">
                Career Readiness
              </span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                {summary?.completionPct || 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${summary?.completionPct || 0}%` }}
              />
            </div>
            <p className="text-[11px] font-body text-ink-60 leading-relaxed">
              Based on your mastery ratings across syllabus topics and completed learning units.
            </p>
          </div>
        </div>
      </div>

      {/* Focus Player Modal */}
      <FocusPlayerModal
        isOpen={focusModal.open}
        onClose={() => setFocusModal((prev) => ({ ...prev, open: false }))}
        topicTitle={focusModal.topicTitle}
        subjectName={focusModal.subjectName}
        onComplete={() => {
          if (focusModal.entryId) {
            handleEntryStatus(focusModal.entryId, "done");
          }
        }}
      />
    </div>
  );
}

