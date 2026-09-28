import { useEffect, useState, useMemo } from "react";
import {
  CalendarDays,
  Zap,
  CheckCircle2,
  Clock,
  Youtube,
  Play,
  Sparkles,
  Map as MapIcon,
  Calendar,
  Brain,
  Filter,
  Trash2,
  Terminal,
  FastForward,
} from "lucide-react";
import api from "../lib/api";
import { useConfirm } from "../context/ConfirmContext";
import { useToast } from "../context/ToastContext";
import EmptyState from "../components/EmptyState";
import FocusPlayerModal from "../components/FocusPlayerModal";
import LearningRoadmap from "../components/LearningRoadmap";
import type { PlanEntry } from "../types";

export default function StudyPlanPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"roadmap" | "calendar">("roadmap");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");

  const [focusModal, setFocusModal] = useState<{
    open: boolean;
    topicTitle: string;
    subjectName: string;
    entryId?: string;
  }>({ open: false, topicTitle: "", subjectName: "" });

  const fetchPlan = async () => {
    try {
      const res = await api.get("/plan/all");
      const planEntries = res.data.data.entries || res.data.data.plan?.planEntries || [];
      setEntries(planEntries);
    } catch {
      try {
        const resFallback = await api.get("/plan/week");
        setEntries(resFallback.data.data.entries || []);
      } catch {
        setError("Failed to load study plan");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const generatePlan = async () => {
    setGenerating(true);
    setError("");
    try {
      await api.post("/plan/generate", {});
      await fetchPlan();
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Failed to generate plan"
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (entryId: string, status: PlanEntry["status"]) => {
    setEntries((prev) =>
      prev.map((e) => (e._id === entryId ? { ...e, status } : e))
    );
    try {
      await api.patch(`/plan/entries/${entryId}`, { status });
      await fetchPlan();
    } catch {
      await fetchPlan();
    }
  };

  const { confirm } = useConfirm();

  const handleRemoveEntry = async (entryId: string, topicTitle?: string) => {
    const confirmed = await confirm({
      title: "Remove from Schedule?",
      message: `Are you sure you want to remove ${topicTitle ? `"${topicTitle}"` : "this topic"} from your study schedule?`,
      confirmText: "Remove",
      destructive: true,
    });
    if (!confirmed) return;

    setEntries((prev) => prev.filter((e) => e._id !== entryId));
    try {
      await api.delete(`/plan/entries/${entryId}`);
      await fetchPlan();
    } catch {
      await fetchPlan();
    }
  };

  const handleClearPlan = async () => {
    const confirmed = await confirm({
      title: "Clear Entire Study Plan?",
      message: "Are you sure you want to clear your study plan? This will reset your entire schedule and free database storage space.",
      confirmText: "Clear Plan",
      destructive: true,
    });
    if (!confirmed) return;

    setClearing(true);
    try {
      await api.delete("/plan/clear");
      setEntries([]);
    } catch {
      setError("Failed to clear plan");
    } finally {
      setClearing(false);
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
        await fetchPlan();
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

  // Distinct subjects in the plan for filtering
  const subjectsInPlan = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    entries.forEach((e) => {
      if (!map.has(e.subjectId)) {
        map.set(e.subjectId, {
          id: e.subjectId,
          name: e.subjectName,
          color: e.subjectColor,
        });
      }
    });
    return Array.from(map.values());
  }, [entries]);

  // Filter entries if subject is selected
  const filteredEntries = useMemo(() => {
    if (selectedSubject === "all") return entries;
    return entries.filter(
      (e) => e.subjectId === selectedSubject || e.subjectName === selectedSubject
    );
  }, [entries, selectedSubject]);

  if (loading) {
    return (
      <div className="p-6 md:p-10 w-full animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-48 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Group filtered entries by date for the calendar view
  const grouped = filteredEntries.reduce<Record<string, PlanEntry[]>>((acc, entry) => {
    const key = new Date(entry.date).toDateString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const dateKeys = Object.keys(grouped).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  return (
    <div className="p-6 md:p-10 w-full pb-24 md:pb-12 text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={15} className="text-[#0A84FF]" />
            <span className="text-xs font-mono text-[#0A84FF] uppercase tracking-wider">
              Pedagogical AI Learning Engine
            </span>
          </div>
          <h1 className="text-3xl text-white font-semibold">
            Adaptive Study Plan
          </h1>
          <p className="text-xs text-ink-60 mt-0.5">
            Unit-by-unit progressive road: foundations first, weak topics boosted, zero random jumps.
          </p>
          {entries.length > 0 && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                ✓ 100% Whole Syllabus Covered ({new Set(entries.map((e) => e.topicId || e.topicTitle)).size} Unique Topics)
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-white/5 text-ink-60 border border-white/10">
                📅 {dateKeys.length} Study Days Planned
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {entries.length > 0 && (
            <button
              onClick={handleClearPlan}
              disabled={clearing}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/20 text-ink-60 hover:text-rose-400 text-xs font-semibold transition-all cursor-pointer"
              title="Clear entire study plan to reset schedule and free DB storage"
            >
              <Trash2 size={13} />
              <span>{clearing ? "Clearing…" : "Clear Plan"}</span>
            </button>
          )}

          <button
            onClick={generatePlan}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all disabled:opacity-50 cursor-pointer shrink-0 shadow-md shadow-[#0A84FF]/20"
          >
            <Zap size={14} />
            <span>{generating ? "Recalculating Plan…" : "Regenerate Plan"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          message="No study plan generated yet"
          subMessage="Generate an AI plan to sequence your curriculum topics with pedagogical logic and milestone checkpoints."
          action={
            <button
              onClick={generatePlan}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Generate My First Plan</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Controls Bar: View Toggle + Subject Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-[#141414] border border-white/8 rounded-2xl">
            {/* View Mode Toggle Switch */}
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode("roadmap")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "roadmap"
                    ? "bg-[#0A84FF] text-white shadow-sm font-semibold"
                    : "text-ink-60 hover:text-white"
                }`}
              >
                <MapIcon size={13} />
                <span>🗺️ Quest Roadmap</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-[#0A84FF] text-white shadow-sm font-semibold"
                    : "text-ink-60 hover:text-white"
                }`}
              >
                <Calendar size={13} />
                <span>📅 Daily Schedule</span>
              </button>
            </div>

            {/* Subject Filter (if multiple subjects) */}
            {subjectsInPlan.length > 1 && (
              <div className="flex items-center gap-2 px-2">
                <Filter size={12} className="text-ink-60" />
                <span className="text-[11px] font-mono text-ink-60">Subject:</span>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="bg-white/5 border border-white/10 text-white text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:border-[#0A84FF]"
                >
                  <option value="all" className="bg-[#1C1C1E] text-white">
                    All Courses ({entries.length} topics)
                  </option>
                  {subjectsInPlan.map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#1C1C1E] text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── ROADMAP VIEW ────────────────────────────────────────────── */}
          {viewMode === "roadmap" ? (
            <LearningRoadmap
              entries={filteredEntries}
              onCompleteTopic={async (id, status) => updateStatus(id, status)}
              onStartFocus={(topicTitle, subjectName, entryId) =>
                setFocusModal({ open: true, topicTitle, subjectName, entryId })
              }
              onDeleteTopic={handleRemoveEntry}
              selectedSubject={selectedSubject === "all" ? undefined : selectedSubject}
            />
          ) : (
            /* ── CALENDAR VIEW ───────────────────────────────────────────── */
            <div className="space-y-8">
              {dateKeys.map((dateKey) => {
                const date = new Date(dateKey);
                const isToday = date.toDateString() === new Date().toDateString();
                const dayEntries = grouped[dateKey];
                const totalMinutes = dayEntries.reduce((s, e) => s + e.estimatedMinutes, 0);

                return (
                  <div key={dateKey} className="space-y-3">
                    {/* Day Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-white/8 flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold ${
                            isToday
                              ? "bg-white text-zinc-950 font-bold shadow-sm"
                              : "bg-white/5 text-ink-60"
                          }`}
                        >
                          {isToday ? "Today" : date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        <span className="text-xs text-ink-60">
                          {date.toLocaleDateString("en-IN", { weekday: "long" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isToday && (
                          <button
                            onClick={handlePullNext}
                            disabled={pullingNext}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-200 hover:text-white border border-white/10 transition-all cursor-pointer disabled:opacity-40"
                            title="Pull the next scheduled topic into today's agenda early"
                          >
                            <FastForward size={12} className="text-[#0A84FF]" />
                            <span>{pullingNext ? "Pulling…" : "Study Ahead (+25 XP)"}</span>
                          </button>
                        )}
                        <span className="text-xs font-mono text-ink-60">
                          {totalMinutes} min scheduled
                        </span>
                      </div>
                    </div>

                    {/* Day Entries List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {dayEntries.map((entry) => {
                        const isDone = entry.status === "done";
                        const isMissed = entry.status === "missed";
                        const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
                          `${entry.subjectName} ${entry.topicTitle} tutorial`
                        )}`;

                        return (
                          <div
                            key={entry._id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              isDone
                                ? "bg-emerald-500/5 border-emerald-500/20 opacity-75"
                                : isMissed
                                ? "bg-rose-500/5 border-rose-500/20 opacity-70"
                                : "bg-[#141414] border border-white/8 hover:border-white/15 shadow-lg"
                            }`}
                          >
                            <div>
                              {/* Top Tag & Time */}
                              <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border truncate"
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
                                  ) : entry.unitNumber ? (
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-ink-60">
                                      Unit {entry.unitNumber}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">
                                    +{entry.xpReward || 50} XP
                                  </span>
                                  <div className="flex items-center gap-1 text-[11px] font-mono text-ink-60 shrink-0">
                                    <Clock size={11} />
                                    <span>{entry.estimatedMinutes}m</span>
                                  </div>
                                </div>
                              </div>

                              {/* Topic Title */}
                              <p
                                className={`text-sm font-medium mb-2 line-clamp-2 ${
                                  isDone ? "line-through text-ink-60" : "text-white"
                                }`}
                              >
                                {entry.topicTitle}
                              </p>

                              {/* 🧠 AI Brain Logic Explanation */}
                              {entry.whyLogic && (
                                <div className="mb-3 p-2 rounded-xl bg-sky-500/5 border border-sky-500/15 flex items-start gap-1.5">
                                  <Brain size={12} className="text-[#0A84FF] shrink-0 mt-0.5" />
                                  <span className="text-[11px] text-ink-60 leading-tight">
                                    <strong className="text-white/80">AI Logic: </strong>
                                    {entry.whyLogic}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Actions Row */}
                            <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {/* Checkbox button */}
                                <button
                                  onClick={() =>
                                    updateStatus(entry._id, isDone ? "pending" : "done")
                                  }
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                                    isDone
                                      ? "bg-emerald-500 text-white font-medium"
                                      : "bg-white/5 text-ink-60 hover:text-white hover:bg-white/10"
                                  }`}
                                >
                                  <CheckCircle2 size={13} />
                                  <span>{isDone ? "Done" : "Mark done"}</span>
                                </button>

                                {/* Missed tag or trigger */}
                                {isMissed ? (
                                  <span className="text-[11px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                                    Rescheduled
                                  </span>
                                ) : !isDone ? (
                                  <button
                                    onClick={() => updateStatus(entry._id, "missed")}
                                    className="text-[11px] text-rose-400/80 hover:text-rose-400 px-1.5 py-0.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  >
                                    Missed
                                  </button>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-2">
                                {/* YouTube Search Link */}
                                <a
                                  href={youtubeSearchUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Watch top YouTube tutorial"
                                >
                                  <Youtube size={15} />
                                </a>

                                {/* Focus Launcher */}
                                <button
                                  onClick={() =>
                                    setFocusModal({
                                      open: true,
                                      topicTitle: entry.topicTitle,
                                      subjectName: entry.subjectName,
                                      entryId: entry._id,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-ink-60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Start Focus Timer"
                                >
                                  <Play size={14} fill="currentColor" />
                                </button>

                                {/* Remove Task from Plan */}
                                <button
                                  onClick={() => handleRemoveEntry(entry._id, entry.topicTitle)}
                                  className="p-1.5 rounded-lg text-ink-60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Remove task from plan"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Focus Player Modal */}
      <FocusPlayerModal
        isOpen={focusModal.open}
        onClose={() => setFocusModal((prev) => ({ ...prev, open: false }))}
        topicTitle={focusModal.topicTitle}
        subjectName={focusModal.subjectName}
        onComplete={() => {
          if (focusModal.entryId) {
            updateStatus(focusModal.entryId, "done");
          }
        }}
      />
    </div>
  );
}
