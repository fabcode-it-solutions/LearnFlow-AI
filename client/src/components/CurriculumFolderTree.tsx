import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder,
  FolderOpen,
  GraduationCap,
  CheckCircle2,
  Circle,
  Clock,
  Youtube,
  ChevronRight,
  ChevronDown,
  Trash2,
  Sparkles,
  Search,
  ArrowRight,
} from "lucide-react";
import api from "../lib/api";
import { parseApiError } from "../lib/error-handler";
import { useToast } from "../context/ToastContext";
import InlineDocViewerModal from "./InlineDocViewerModal";
import type { Subject, Topic, ResourceType } from "../types";

interface CurriculumFolderTreeProps {
  subjects: Subject[];
  onDeleteSubject: (id: string, name: string) => void;
  onUpdateSubject?: (updated: Subject) => void;
}

// Clean unit title to prevent repeating "Unit 1 Unit 1: ..."
function cleanUnitTitle(uNum: number, rawTitle?: string): string {
  if (!rawTitle || !rawTitle.trim()) return `Unit ${uNum}`;
  const trimmed = rawTitle.trim();
  // Strip redundant "Unit X:" or "Unit X -" prefix
  const stripped = trimmed.replace(new RegExp(`^Unit\\s*${uNum}\\s*[:\\-–—]?\\s*`, "i"), "").trim();
  return stripped ? `Unit ${uNum}: ${stripped}` : `Unit ${uNum}`;
}

// Helper to infer degree name if not explicitly set
function resolveDegree(s: Subject): string {
  if (s.degreeOrProgram && s.degreeOrProgram.trim() && s.degreeOrProgram.toLowerCase() !== "general") {
    return s.degreeOrProgram.trim();
  }
  const track = (s.semesterOrTrack || "").toUpperCase();
  if (track.includes("MCA")) return "MCA";
  if (track.includes("B.TECH") || track.includes("BTECH")) return "B.Tech";
  if (track.includes("BCA")) return "BCA";
  if (track.includes("BSC") || track.includes("B.SC")) return "B.Sc CS";
  if (track.includes("JOB PREP") || track.includes("CAREER")) return "Job Prep & Career";
  return s.degreeOrProgram || "MCA";
}

function resolveSemester(s: Subject): string {
  return s.semesterOrTrack?.trim() || "1st Semester";
}

export default function CurriculumFolderTree({
  subjects,
  onDeleteSubject,
  onUpdateSubject,
}: CurriculumFolderTreeProps) {
  const { toast } = useToast();

  // Search filter
  const [search, setSearch] = useState("");

  // Expansion tracking
  const [expandedDegrees, setExpandedDegrees] = useState<Record<string, boolean>>({});
  const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});

  // Inline document viewer state
  const [viewerModal, setViewerModal] = useState<{
    open: boolean;
    title: string;
    url: string;
    type: ResourceType;
  }>({
    open: false,
    title: "",
    url: "",
    type: "drive",
  });

  // Local subjects state to support optimistic updates
  const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects);

  // Sync if prop changes
  useMemo(() => {
    setLocalSubjects(subjects);
  }, [subjects]);

  // Grouping hierarchy: Degree -> Semester -> Subject -> Content
  const treeData = useMemo(() => {
    const q = search.trim().toLowerCase();

    const degreeMap = new Map<string, Map<string, Subject[]>>();

    for (const sub of localSubjects) {
      const deg = resolveDegree(sub);
      const sem = resolveSemester(sub);

      // Search match test
      if (q) {
        const matchesSub = sub.name.toLowerCase().includes(q);
        const matchesDeg = deg.toLowerCase().includes(q);
        const matchesSem = sem.toLowerCase().includes(q);
        const matchesTopic = sub.topics.some((t) => t.title.toLowerCase().includes(q));
        if (!matchesSub && !matchesDeg && !matchesSem && !matchesTopic) {
          continue;
        }
      }

      if (!degreeMap.has(deg)) {
        degreeMap.set(deg, new Map());
      }
      const semMap = degreeMap.get(deg)!;
      if (!semMap.has(sem)) {
        semMap.set(sem, []);
      }
      semMap.get(sem)!.push(sub);
    }

    return Array.from(degreeMap.entries()).map(([degName, semMap]) => {
      const semesters = Array.from(semMap.entries()).map(([semName, subs]) => {
        const semTopics = subs.flatMap((s) => s.topics);
        const semCompleted = semTopics.filter((t) => t.completed).length;
        return {
          semName,
          subs,
          totalTopics: semTopics.length,
          completedTopics: semCompleted,
          progressPct:
            semTopics.length > 0 ? Math.round((semCompleted / semTopics.length) * 100) : 0,
        };
      });

      const totalDegreeSubs = semesters.flatMap((s) => s.subs);
      const totalDegreeTopics = totalDegreeSubs.flatMap((s) => s.topics);
      const totalDegreeCompleted = totalDegreeTopics.filter((t) => t.completed).length;

      return {
        degName,
        semesters,
        totalSubjectsCount: totalDegreeSubs.length,
        totalTopicsCount: totalDegreeTopics.length,
        totalCompletedCount: totalDegreeCompleted,
        degreeProgressPct:
          totalDegreeTopics.length > 0
            ? Math.round((totalDegreeCompleted / totalDegreeTopics.length) * 100)
            : 0,
      };
    });
  }, [localSubjects, search]);

  // Toggle helpers
  const toggleDegree = (degName: string) => {
    setExpandedDegrees((prev) => ({
      ...prev,
      [degName]: prev[degName] === undefined ? false : !prev[degName],
    }));
  };

  const toggleSemester = (semKey: string) => {
    setExpandedSemesters((prev) => ({
      ...prev,
      [semKey]: prev[semKey] === undefined ? false : !prev[semKey],
    }));
  };

  const toggleSubject = (subId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  };

  const toggleUnit = (unitKey: string) => {
    setCollapsedUnits((prev) => ({
      ...prev,
      [unitKey]: !prev[unitKey],
    }));
  };

  const expandAll = () => {
    const nextDeg: Record<string, boolean> = {};
    const nextSem: Record<string, boolean> = {};
    const nextSub: Record<string, boolean> = {};

    treeData.forEach((d) => {
      nextDeg[d.degName] = true;
      d.semesters.forEach((s) => {
        const semKey = `${d.degName}-${s.semName}`;
        nextSem[semKey] = true;
        s.subs.forEach((sub) => {
          nextSub[sub._id] = true;
        });
      });
    });

    setExpandedDegrees(nextDeg);
    setExpandedSemesters(nextSem);
    setExpandedSubjects(nextSub);
    setCollapsedUnits({});
  };

  const collapseAll = () => {
    const nextDeg: Record<string, boolean> = {};
    const nextSem: Record<string, boolean> = {};
    const nextSub: Record<string, boolean> = {};

    treeData.forEach((d) => {
      nextDeg[d.degName] = false;
      d.semesters.forEach((s) => {
        const semKey = `${d.degName}-${s.semName}`;
        nextSem[semKey] = false;
        s.subs.forEach((sub) => {
          nextSub[sub._id] = false;
        });
      });
    });

    setExpandedDegrees(nextDeg);
    setExpandedSemesters(nextSem);
    setExpandedSubjects(nextSub);
  };

  // Toggle Topic completion
  const handleToggleTopic = async (subjectId: string, topicId: string, currentCompleted: boolean) => {
    const newStatus = !currentCompleted;

    setLocalSubjects((prev) =>
      prev.map((s) => {
        if (s._id !== subjectId) return s;
        return {
          ...s,
          topics: s.topics.map((t) =>
            t._id === topicId ? { ...t, completed: newStatus } : t
          ),
        };
      })
    );

    try {
      const res = await api.put(`/subjects/${subjectId}/topics/${topicId}`, {
        completed: newStatus,
      });
      if (res.data?.data?.subject && onUpdateSubject) {
        onUpdateSubject(res.data.data.subject);
      }
    } catch (err: unknown) {
      toast({ title: parseApiError(err).message, type: "error" });
      setLocalSubjects(subjects);
    }
  };

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  };

  return (
    <div className="space-y-4">
      {/* ── Toolbar: Search & Expand/Collapse All ─────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-[#141414] border border-white/8 rounded-2xl p-3 sm:p-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search degree, semester, subject, or topic..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/50 focus:outline-none focus:border-[#0A84FF]/50"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={expandAll}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ink-60 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-ink-60 hover:text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Empty State ──────────────────────────────────────────────── */}
      {treeData.length === 0 && (
        <div className="bg-[#141414] border border-white/8 rounded-2xl p-10 text-center text-ink-60 text-xs">
          <Folder size={28} className="mx-auto mb-2 text-ink-60/40" />
          <p>No matching courses or topics found.</p>
        </div>
      )}

      {/* ── Level 1: Degree / Program (e.g. MCA, B.Tech) ─────────────── */}
      <div className="space-y-3.5">
        {treeData.map((degree) => {
          const isDegreeOpen = expandedDegrees[degree.degName] !== false;

          return (
            <div
              key={degree.degName}
              className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-lg transition-all"
            >
              {/* Degree Header */}
              <div
                onClick={() => toggleDegree(degree.degName)}
                className="px-3.5 sm:px-5 py-3.5 bg-gradient-to-r from-white/[0.03] to-transparent hover:bg-white/[0.05] cursor-pointer flex items-center justify-between gap-3 transition-colors select-none"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <div className="w-5 h-5 flex items-center justify-center text-ink-60 shrink-0">
                    {isDegreeOpen ? <ChevronDown size={17} /> : <ChevronRight size={17} />}
                  </div>

                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#0A84FF]/10 border border-[#0A84FF]/20 flex items-center justify-center text-[#0A84FF] shrink-0">
                    <GraduationCap size={18} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                      {degree.degName}
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-ink-60 truncate">
                      {degree.semesters.length} Semesters • {degree.totalSubjectsCount} Courses • {degree.totalTopicsCount} Topics
                    </p>
                  </div>
                </div>

                {/* Degree Progress */}
                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] sm:text-xs font-semibold text-white">
                      {degree.degreeProgressPct}%
                    </span>
                    <span className="text-[9px] sm:text-[10px] font-mono text-ink-60 hidden sm:inline">
                      {degree.totalCompletedCount}/{degree.totalTopicsCount}
                    </span>
                  </div>
                  <div className="w-12 sm:w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-[#0A84FF] rounded-full transition-all duration-500"
                      style={{ width: `${degree.degreeProgressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* ── Level 2: Semester (e.g. MCA 1ST SEM) ──────────────── */}
              <AnimatePresence>
                {isDegreeOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-2 sm:p-4 space-y-2.5 border-t border-white/5 bg-black/20"
                  >
                    {degree.semesters.map((sem) => {
                      const semKey = `${degree.degName}-${sem.semName}`;
                      const isSemOpen = expandedSemesters[semKey] !== false;

                      return (
                        <div
                          key={semKey}
                          className="border border-white/8 rounded-xl overflow-hidden bg-[#161616] ml-0 sm:ml-2.5"
                        >
                          {/* Semester Header */}
                          <div
                            onClick={() => toggleSemester(semKey)}
                            className="px-3 sm:px-4 py-2.5 sm:py-3 bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer flex items-center justify-between gap-2.5 transition-colors select-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-4 h-4 flex items-center justify-center text-ink-60 shrink-0">
                                {isSemOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                              </div>

                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                {isSemOpen ? <FolderOpen size={14} /> : <Folder size={14} />}
                              </div>

                              <div className="min-w-0">
                                <h3 className="text-xs sm:text-sm font-semibold text-white truncate">
                                  {sem.semName}
                                </h3>
                                <p className="text-[10px] text-ink-60 truncate">
                                  {sem.subs.length} Courses • {sem.completedTopics}/{sem.totalTopics} Topics ({sem.progressPct}%)
                                </p>
                              </div>
                            </div>

                            <span className="text-[10px] sm:text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-ink-60 border border-white/10 shrink-0">
                              {sem.progressPct}%
                            </span>
                          </div>

                          {/* ── Level 3: Subject Courses ──────────────── */}
                          <AnimatePresence>
                            {isSemOpen && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-2 sm:p-3 space-y-2 border-t border-white/5 bg-black/30"
                              >
                                {sem.subs.map((sub) => {
                                  const isSubOpen = !!expandedSubjects[sub._id];
                                  const completedTopics = sub.topics.filter((t) => t.completed).length;
                                  const totalTopics = sub.topics.length;
                                  const subProgress =
                                    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
                                  const days = daysUntil(sub.examDate);

                                  // Group topics by Unit Number
                                  const unitMap = new Map<number, { unitTitle: string; topics: Topic[] }>();
                                  for (const t of sub.topics) {
                                    const uNum = t.unitNumber || 1;
                                    if (!unitMap.has(uNum)) {
                                      unitMap.set(uNum, {
                                        unitTitle: t.unitTitle || `Unit ${uNum}`,
                                        topics: [],
                                      });
                                    }
                                    unitMap.get(uNum)!.topics.push(t);
                                  }
                                  const sortedUnits = Array.from(unitMap.entries()).sort(
                                    (a, b) => a[0] - b[0]
                                  );

                                  return (
                                    <div
                                      key={sub._id}
                                      className="border border-white/8 hover:border-white/15 rounded-xl overflow-hidden bg-[#181818] transition-all"
                                    >
                                      {/* Subject Header (Mobile-Optimized) */}
                                      <div
                                        onClick={() => toggleSubject(sub._id)}
                                        className="p-3 sm:p-3.5 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                            <div className="w-4 h-4 flex items-center justify-center text-ink-60 shrink-0">
                                              {isSubOpen ? (
                                                <ChevronDown size={14} />
                                              ) : (
                                                <ChevronRight size={14} />
                                              )}
                                            </div>

                                            <div
                                              className="w-2.5 h-2.5 rounded-full shrink-0"
                                              style={{ backgroundColor: sub.colorTag }}
                                            />

                                            <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                                              {sub.name}
                                            </span>

                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-ink-60 shrink-0">
                                              {totalTopics}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-white">
                                              {subProgress}%
                                            </span>

                                            <Link
                                              to={`/subjects/${sub._id}`}
                                              onClick={(e) => e.stopPropagation()}
                                              className="p-1.5 rounded-lg bg-white/5 hover:bg-[#0A84FF] text-ink-60 hover:text-white transition-colors"
                                              title="Open full course page"
                                            >
                                              <ArrowRight size={13} />
                                            </Link>

                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteSubject(sub._id, sub.name);
                                              }}
                                              className="p-1.5 rounded-lg text-ink-60 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                              title="Delete Subject"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 mt-1.5 text-[10px] sm:text-[11px] text-ink-60 pl-6 flex-wrap">
                                          <span>Exam in {days} days</span>
                                          <span>•</span>
                                          <span>{sub.resources?.length || 0} Docs/Vault</span>
                                          <span>•</span>
                                          <span>{sub.notes?.length || 0} Notes</span>
                                        </div>
                                      </div>

                                      {/* ── Level 4: Subject Contents ─────────── */}
                                      <AnimatePresence>
                                        {isSubOpen && (
                                          <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="p-2.5 sm:p-4 border-t border-white/5 bg-[#121212] space-y-3.5"
                                          >
                                            {/* Units List */}
                                            {sortedUnits.length === 0 ? (
                                              <div className="text-center py-4 text-ink-60 text-xs">
                                                <p>No topics added to this subject yet.</p>
                                                <Link
                                                  to={`/subjects/${sub._id}`}
                                                  className="inline-flex items-center gap-1.5 mt-2 text-[#0A84FF] hover:underline font-semibold"
                                                >
                                                  <Sparkles size={12} />
                                                  <span>Parse Syllabus or Add Topics</span>
                                                </Link>
                                              </div>
                                            ) : (
                                              <div className="space-y-2.5">
                                                <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-ink-60">
                                                  <span>Curriculum Units ({sortedUnits.length})</span>
                                                  <span>
                                                    {completedTopics}/{totalTopics} Done
                                                  </span>
                                                </div>

                                                <div className="space-y-2">
                                                  {sortedUnits.map(([uNum, unitData]) => {
                                                    const unitKey = `${sub._id}-unit-${uNum}`;
                                                    const isUnitCollapsed = !!collapsedUnits[unitKey];
                                                    const unitCompleted = unitData.topics.filter(
                                                      (t) => t.completed
                                                    ).length;
                                                    const displayTitle = cleanUnitTitle(
                                                      uNum,
                                                      unitData.unitTitle
                                                    );

                                                    return (
                                                      <div
                                                        key={uNum}
                                                        className="border border-white/6 rounded-xl bg-white/[0.02] overflow-hidden"
                                                      >
                                                        {/* Unit Header with Toggle */}
                                                        <div
                                                          onClick={() => toggleUnit(unitKey)}
                                                          className="p-2.5 sm:p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-white/[0.03] transition-colors select-none"
                                                        >
                                                          <div className="flex items-center gap-2 min-w-0">
                                                            <div className="text-ink-60 shrink-0">
                                                              {isUnitCollapsed ? (
                                                                <ChevronRight size={13} />
                                                              ) : (
                                                                <ChevronDown size={13} />
                                                              )}
                                                            </div>
                                                            <span className="text-xs font-semibold text-white/95 truncate">
                                                              {displayTitle}
                                                            </span>
                                                          </div>

                                                          <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[10px] font-mono text-ink-60">
                                                              {unitCompleted}/{unitData.topics.length} done
                                                            </span>
                                                          </div>
                                                        </div>

                                                        {/* Unit Topics (Collapsible) */}
                                                        <AnimatePresence>
                                                          {!isUnitCollapsed && (
                                                            <motion.div
                                                              initial={{ opacity: 0, height: 0 }}
                                                              animate={{ opacity: 1, height: "auto" }}
                                                              exit={{ opacity: 0, height: 0 }}
                                                              className="px-2 pb-2 pt-0.5 space-y-1.5 border-t border-white/5"
                                                            >
                                                              {unitData.topics.map((t) => (
                                                                <div
                                                                  key={t._id}
                                                                  className="flex items-center justify-between gap-2 p-1.5 sm:p-2 rounded-lg bg-black/20 hover:bg-white/[0.04] transition-colors"
                                                                >
                                                                  <div className="flex items-center gap-2 min-w-0">
                                                                    <button
                                                                      type="button"
                                                                      onClick={() =>
                                                                        handleToggleTopic(
                                                                          sub._id,
                                                                          t._id,
                                                                          t.completed
                                                                        )
                                                                      }
                                                                      className="shrink-0 text-ink-60 hover:text-white cursor-pointer transition-colors"
                                                                    >
                                                                      {t.completed ? (
                                                                        <CheckCircle2
                                                                          size={15}
                                                                          className="text-emerald-400"
                                                                        />
                                                                      ) : (
                                                                        <Circle
                                                                          size={15}
                                                                          className="text-ink-60 hover:text-white"
                                                                        />
                                                                      )}
                                                                    </button>

                                                                    <span
                                                                      className={`text-xs truncate ${
                                                                        t.completed
                                                                          ? "line-through text-ink-60"
                                                                          : "text-white"
                                                                      }`}
                                                                    >
                                                                      {t.title}
                                                                    </span>
                                                                  </div>

                                                                  <div className="flex items-center gap-1.5 shrink-0">
                                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-ink-60 hidden sm:inline">
                                                                      ⭐ {t.confidenceScore}/5
                                                                    </span>

                                                                    <span className="text-[10px] font-mono text-ink-60 flex items-center gap-1">
                                                                      <Clock size={10} />
                                                                      {t.estimatedMinutes}m
                                                                    </span>

                                                                    <button
                                                                      type="button"
                                                                      onClick={() => {
                                                                        const query = encodeURIComponent(
                                                                          `${sub.name} ${t.title} tutorial`
                                                                        );
                                                                        setViewerModal({
                                                                          open: true,
                                                                          title: `${t.title} — Video Lectures`,
                                                                          url: `https://www.youtube.com/results?search_query=${query}`,
                                                                          type: "youtube",
                                                                        });
                                                                      }}
                                                                      className="p-1 rounded text-ink-60 hover:text-red-400 transition-colors"
                                                                      title="Search YouTube Tutorials"
                                                                    >
                                                                      <Youtube size={13} />
                                                                    </button>
                                                                  </div>
                                                                </div>
                                                              ))}
                                                            </motion.div>
                                                          )}
                                                        </AnimatePresence>
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}

                                            {/* Resource Vault */}
                                            {sub.resources && sub.resources.length > 0 && (
                                              <div className="pt-2 border-t border-white/5 space-y-1.5">
                                                <span className="text-[10px] font-mono uppercase tracking-wider text-ink-60">
                                                  Resources &amp; Docs ({sub.resources.length})
                                                </span>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                                  {sub.resources.map((res) => (
                                                    <div
                                                      key={res._id}
                                                      className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between gap-2"
                                                    >
                                                      <div className="min-w-0">
                                                        <h5 className="text-xs font-semibold text-white truncate">
                                                          {res.title}
                                                        </h5>
                                                        <span className="text-[9px] font-mono text-ink-60 uppercase">
                                                          {res.type}
                                                        </span>
                                                      </div>

                                                      <button
                                                        type="button"
                                                        onClick={() =>
                                                          setViewerModal({
                                                            open: true,
                                                            title: res.title,
                                                            url: res.url,
                                                            type: res.type,
                                                          })
                                                        }
                                                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[10px] font-mono text-white shrink-0 cursor-pointer"
                                                      >
                                                        View
                                                      </button>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Link to Full Subject Workspace */}
                                            <div className="pt-1.5 flex justify-end">
                                              <Link
                                                to={`/subjects/${sub._id}`}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors"
                                              >
                                                <span>Open Course Workspace</span>
                                                <ArrowRight size={12} />
                                              </Link>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Document Viewer Modal ────────────────────────────────────── */}
      <InlineDocViewerModal
        isOpen={viewerModal.open}
        onClose={() => setViewerModal((prev) => ({ ...prev, open: false }))}
        title={viewerModal.title}
        url={viewerModal.url}
        type={viewerModal.type}
      />
    </div>
  );
}
