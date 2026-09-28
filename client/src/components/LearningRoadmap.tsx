import { useState, useMemo } from "react";
import {
  Trophy,
  Flame,
  CheckCircle2,
  Lock,
  Play,
  Brain,
  Clock,
  Award,
  Mountain,
  Flag,
  Sparkles,
  Compass,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { PlanEntry } from "../types";

interface LearningRoadmapProps {
  entries: PlanEntry[];
  onCompleteTopic: (entryId: string, status: "done" | "pending") => Promise<void>;
  onStartFocus: (topicTitle: string, subjectName: string, entryId?: string) => void;
  onDeleteTopic?: (entryId: string, topicTitle?: string) => Promise<void>;
  selectedSubject?: string;
}

export default function LearningRoadmap({
  entries,
  onCompleteTopic,
  onStartFocus,
  onDeleteTopic,
  selectedSubject,
}: LearningRoadmapProps) {
  const [selectedUnit, setSelectedUnit] = useState<number | "all">("all");

  // Filter entries if subject or unit is selected
  const filteredEntries = useMemo(() => {
    let list = entries;
    if (selectedSubject && selectedSubject !== "all") {
      list = list.filter((e) => e.subjectName === selectedSubject || e.subjectId === selectedSubject);
    }
    if (selectedUnit !== "all") {
      list = list.filter((e) => (e.unitNumber || 1) === selectedUnit);
    }
    return list;
  }, [entries, selectedSubject, selectedUnit]);

  // Deduplicate entries by unique topic so rescheduled missed tasks don't bloat the quest stops
  const uniqueStops = useMemo(() => {
    const map = new Map<string, PlanEntry>();
    for (const e of filteredEntries) {
      const key = e.topicId || e.topicTitle;
      if (!map.has(key) || e.status === "done") {
        map.set(key, e);
      }
    }
    return Array.from(map.values());
  }, [filteredEntries]);

  // Gamification Metrics based on unique stops
  const totalStops = uniqueStops.length;
  const completedStops = uniqueStops.filter((e) => e.status === "done").length;
  const totalXp = completedStops * 50;
  const currentLevel = Math.floor(totalXp / 200) + 1;
  const levelProgressPct = Math.round(((totalXp % 200) / 200) * 100);
  const completionPct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  // Mountain Altitude calculation (Basecamp 850m -> Summit 5,200m)
  const currentAltitude = Math.round(850 + (completionPct / 100) * 4350);
  const expeditionZone =
    completionPct >= 100
      ? "🚩 Everest Summit Conquered"
      : completionPct >= 75
      ? "❄️ High Glacier Ridge"
      : completionPct >= 50
      ? "⛰️ Alpine Rocky Pass"
      : completionPct >= 25
      ? "🌲 Mountain Pine Belt"
      : "🏕️ Valley Basecamp";

  // Find current active stop (first pending entry)
  const activeEntryIndex = uniqueStops.findIndex((e) => e.status !== "done");
  const activeEntry = activeEntryIndex !== -1 ? uniqueStops[activeEntryIndex] : null;

  // Available units for filtering
  const availableUnits = useMemo(() => {
    const set = new Set<number>();
    entries.forEach((e) => set.add(e.unitNumber || 1));
    return Array.from(set).sort((a, b) => a - b);
  }, [entries]);

  return (
    <div className="space-y-6">
      {/* ── Mountain Summit Expedition Banner ────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#141824] via-[#12141C] to-[#0E1017] border border-white/10 shadow-2xl p-6">
        {/* Mountain Silhouette Background Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
          <svg
            className="absolute bottom-0 w-full h-44 text-[#0A84FF]"
            viewBox="0 0 1200 320"
            fill="currentColor"
            preserveAspectRatio="none"
          >
            <path d="M0,320 L120,210 L220,260 L380,120 L480,210 L620,80 L760,230 L890,140 L1020,250 L1120,180 L1200,320 Z" opacity="0.3" />
            <path d="M0,320 L160,250 L290,160 L420,280 L560,110 L680,240 L840,90 L980,270 L1100,190 L1200,320 Z" opacity="0.6" />
            <path d="M0,320 L240,180 L440,290 L600,140 L720,260 L860,130 L1040,290 L1200,200 L1200,320 Z" opacity="0.9" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Expedition Rank & Player Profile */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0A84FF] via-indigo-500 to-sky-400 text-white flex flex-col items-center justify-center font-bold text-sm shadow-xl shadow-[#0A84FF]/25 shrink-0 border border-white/20">
              <Mountain size={18} className="mb-0.5" />
              <span>Lvl {currentLevel}</span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-white tracking-tight">
                  Academic Summit Trail
                </span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-semibold flex items-center gap-1">
                  <Sparkles size={11} />
                  {totalXp} Total XP
                </span>
              </div>

              {/* Altitude & Zone Meter */}
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-[#0A84FF] font-semibold flex items-center gap-1">
                  <Compass size={13} />
                  {expeditionZone}
                </span>
                <span className="text-ink-60">&bull;</span>
                <span className="text-ink-60 font-mono text-[11px]">
                  Alt: {currentAltitude}m
                </span>
              </div>

              {/* Progress to Next Level */}
              <div className="flex items-center gap-2.5 mt-2">
                <div className="w-44 h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgressPct}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full bg-gradient-to-r from-[#0A84FF] via-teal-400 to-emerald-400 rounded-full"
                  />
                </div>
                <span className="text-[10px] font-mono text-ink-60">
                  {totalXp % 200} / 200 XP to Lvl {currentLevel + 1}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-6 sm:gap-8 flex-wrap bg-white/[0.03] border border-white/5 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Flame size={18} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-ink-60 uppercase">Waypoints</p>
                <p className="text-xs font-bold text-white font-mono">
                  {completedStops} / {totalStops} Cleared
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Trophy size={18} />
              </div>
              <div>
                <p className="text-[10px] font-mono text-ink-60 uppercase">Summit Progress</p>
                <p className="text-xs font-bold text-emerald-400 font-mono">
                  {completionPct}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Current Active Mission Banner */}
        {activeEntry && (
          <div className="relative z-10 mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-3.5 w-3.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0A84FF] opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#0A84FF]" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-[#0A84FF] uppercase tracking-wider font-semibold">
                  Next Mountain Stoppage &bull; Unit {activeEntry.unitNumber || 1}
                </p>
                <p className="text-xs font-semibold text-white truncate">
                  {activeEntry.topicTitle}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onStartFocus(activeEntry.topicTitle, activeEntry.subjectName, activeEntry._id)
              }
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md shadow-[#0A84FF]/25 cursor-pointer shrink-0"
            >
              <Play size={12} fill="currentColor" />
              <span>Conquer Stop Now</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Unit Filter Pills ────────────────────────────────────────── */}
      {availableUnits.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedUnit("all")}
            className={`px-3 py-1.5 rounded-xl text-xs transition-colors shrink-0 cursor-pointer ${
              selectedUnit === "all"
                ? "bg-white/15 text-white font-medium"
                : "bg-white/5 text-ink-60 hover:text-white"
            }`}
          >
            Full Trail ({entries.length} Stops)
          </button>
          {availableUnits.map((u) => {
            const unitStops = entries.filter((e) => (e.unitNumber || 1) === u).length;
            const unitDone = entries.filter(
              (e) => (e.unitNumber || 1) === u && e.status === "done"
            ).length;

            return (
              <button
                key={u}
                type="button"
                onClick={() => setSelectedUnit(u)}
                className={`px-3 py-1.5 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  selectedUnit === u
                    ? "bg-[#0A84FF]/20 text-[#0A84FF] font-medium border border-[#0A84FF]/30"
                    : "bg-white/5 text-ink-60 hover:text-white"
                }`}
              >
                <span>Unit {u} Ridge</span>
                <span className="text-[10px] opacity-70">
                  ({unitDone}/{unitStops})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── The Winding Mountain Road Trail ──────────────────────────── */}
      <div className="relative py-8 max-w-3xl mx-auto">
        <div className="space-y-12">
          {uniqueStops.map((entry, idx) => {
            const isDone = entry.status === "done";
            const isActive = activeEntry?._id === entry._id;
            const isLocked =
              !isDone && !isActive && idx > (activeEntryIndex === -1 ? 999 : activeEntryIndex);
            
            // Switchback alternation: even on left, odd on right
            const isEven = idx % 2 === 0;

            // Unit Boss Gate transition
            const prevEntry = uniqueStops[idx - 1];
            const isNewUnitGate =
              idx > 0 &&
              (entry.unitNumber || 1) !== (prevEntry?.unitNumber || 1);

            // Waypoint Elevation
            const waypointAlt = Math.round(
              850 + (idx / Math.max(uniqueStops.length - 1, 1)) * 4350
            );

            // Is final stop of the entire roadmap?
            const isSummitStop = idx === uniqueStops.length - 1;

            return (
              <div key={entry._id || idx} className="relative">
                {/* ── Unit Gateway Mountain Pass Milestone ── */}
                {isNewUnitGate && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative z-20 flex items-center justify-center my-8"
                  >
                    <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 border border-amber-500/30 text-xs text-amber-300 font-semibold shadow-xl">
                      <Award size={18} className="text-amber-400" />
                      <span>
                        🏔️ Alpine Pass Checkpoint &bull; Unit {entry.unitNumber} Unlocked! (+100 XP Bonus)
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* ── Connecting Curved Mountain Road SVG ── */}
                {idx < uniqueStops.length - 1 && (
                  <div
                    className="hidden sm:block absolute pointer-events-none z-0"
                    style={{
                      top: "2.75rem",
                      left: "0",
                      right: "0",
                      height: "6rem",
                    }}
                  >
                    <svg
                      className="w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient
                          id={`roadGrad-${idx}`}
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor={isDone ? "#10B981" : "#0A84FF"} stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
                        </linearGradient>
                      </defs>

                      {/* Road Bed (Wide Asphalt Track) */}
                      <path
                        d={
                          isEven
                            ? "M 32 0 C 48 30, 52 70, 68 100"
                            : "M 68 0 C 52 30, 48 70, 32 100"
                        }
                        fill="none"
                        stroke="#1C1E26"
                        strokeWidth="14"
                        strokeLinecap="round"
                      />

                      {/* Road Glowing Center Line with Mountain Curves */}
                      <path
                        d={
                          isEven
                            ? "M 32 0 C 48 30, 52 70, 68 100"
                            : "M 68 0 C 52 30, 48 70, 32 100"
                        }
                        fill="none"
                        stroke={`url(#roadGrad-${idx})`}
                        strokeWidth="2.5"
                        strokeDasharray="4 4"
                      />
                    </svg>

                    {/* Mountain Icon at curve switchback */}
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 opacity-30 text-white ${
                        isEven ? "right-1/4" : "left-1/4"
                      }`}
                    >
                      <Mountain size={14} />
                    </div>
                  </div>
                )}

                {/* ── Mobile Vertical Curved Spine ── */}
                <div className="sm:hidden absolute top-10 bottom-0 left-6 -ml-px w-1 bg-gradient-to-b from-[#0A84FF]/60 via-emerald-400/40 to-white/10 rounded-full" />

                {/* ── Stop Row Layout (Alternating Left & Right) ── */}
                <div
                  className={`relative z-10 flex items-start gap-4 sm:gap-10 ${
                    isEven ? "sm:flex-row" : "sm:flex-row-reverse"
                  }`}
                >
                  {/* Stop Marker Node (Mountain Waypoint) */}
                  <div className="relative flex flex-col items-center justify-center shrink-0 sm:mx-auto">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onCompleteTopic(entry._id, isDone ? "pending" : "done")}
                      className={`w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-xs transition-all cursor-pointer shadow-xl relative ${
                        isDone
                          ? "bg-emerald-500 text-white shadow-emerald-500/30 border-2 border-emerald-300"
                          : isActive
                          ? "bg-[#0A84FF] text-white shadow-[#0A84FF]/60 border-2 border-white ring-4 ring-[#0A84FF]/30 animate-pulse"
                          : isLocked
                          ? "bg-[#18191E] text-ink-60 border border-white/10 opacity-70"
                          : "bg-white/10 text-white border border-white/20 hover:border-[#0A84FF]"
                      }`}
                      title={
                        isDone
                          ? "Mastered! Click to reopen"
                          : isActive
                          ? "Active Quest Waypoint — Click to complete"
                          : "Click to conquer waypoint"
                      }
                    >
                      {isSummitStop ? (
                        <Flag size={20} className={isDone ? "text-white" : "text-amber-400"} />
                      ) : isDone ? (
                        <CheckCircle2 size={22} />
                      ) : isLocked ? (
                        <Lock size={16} />
                      ) : (
                        <span className="font-mono text-sm">{entry.orderIndex || idx + 1}</span>
                      )}
                    </motion.button>

                    {/* Altitude Tag below Waypoint Node */}
                    <span className="hidden sm:block text-[9px] font-mono text-ink-60/80 mt-1">
                      {waypointAlt}m
                    </span>
                  </div>

                  {/* Stop Information Card */}
                  <div className="flex-1 max-w-sm">
                    <motion.div
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      className={`p-4 rounded-2xl border transition-all ${
                        isActive
                          ? "bg-[#161820] border-[#0A84FF]/50 shadow-2xl shadow-[#0A84FF]/15 ring-1 ring-[#0A84FF]/40"
                          : isDone
                          ? "bg-[#141414] border-emerald-500/25 opacity-85"
                          : "bg-[#141414] border-white/8 hover:border-white/20 shadow-md"
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          {entry.entryType === "coding_lab" || entry.topicTitle.includes("Code Lab") ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                              💻 Coding Lab
                            </span>
                          ) : entry.entryType === "mock_quiz" || entry.topicTitle.includes("Mock Quiz") ? (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-400 font-semibold">
                              📝 Active Recall
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-[#0A84FF] px-2 py-0.5 rounded-full bg-white/5 border border-[#0A84FF]/25 font-semibold">
                              Unit {entry.unitNumber || 1}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-ink-60 flex items-center gap-1">
                            <Mountain size={10} />
                            {waypointAlt}m
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                            isDone
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isActive
                              ? "bg-[#0A84FF]/10 text-[#0A84FF] border border-[#0A84FF]/30 font-bold"
                              : "bg-white/5 text-ink-60"
                          }`}
                        >
                          +{entry.xpReward || 50} XP
                        </span>
                      </div>

                      {/* Topic Title */}
                      <h4
                        className={`text-sm font-semibold mb-2 ${
                          isDone ? "line-through text-ink-60" : "text-white"
                        }`}
                      >
                        {entry.topicTitle}
                      </h4>

                      {/* 🧠 AI Brain Rationale ("Why this topic now") */}
                      {entry.whyLogic && (
                        <div className="mb-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/5">
                          <div className="flex items-start gap-2">
                            <Brain size={13} className="text-[#0A84FF] shrink-0 mt-0.5" />
                            <p className="text-[11px] text-ink-60 leading-relaxed">
                              <span className="text-white/80 font-medium">AI Brain: </span>
                              {entry.whyLogic}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
                        <span className="text-[11px] font-mono text-ink-60 flex items-center gap-1">
                          <Clock size={11} />
                          {entry.estimatedMinutes}m est.
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              onStartFocus(entry.topicTitle, entry.subjectName, entry._id)
                            }
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-white transition-colors cursor-pointer"
                          >
                            <Play size={10} fill="currentColor" />
                            <span>Focus</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              onCompleteTopic(entry._id, isDone ? "pending" : "done")
                            }
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                              isDone
                                ? "bg-white/5 text-ink-60 hover:text-white"
                                : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                            }`}
                          >
                            {isDone ? "Reopen" : "Done"}
                          </button>

                          {onDeleteTopic && (
                            <button
                              type="button"
                              onClick={() => onDeleteTopic(entry._id, entry.topicTitle)}
                              className="p-1 rounded-lg text-ink-60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Remove topic from plan"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
