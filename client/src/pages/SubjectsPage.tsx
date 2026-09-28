import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Plus,
  Trash2,
  ChevronRight,
  Target,
  Folder,
  FolderPlus,
  FileText,
  Layers,
  FolderTree,
  LayoutGrid,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../lib/api";
import { parseApiError } from "../lib/error-handler";
import EmptyState from "../components/EmptyState";
import Modal from "../components/Modal";
import BatchSemesterModal from "../components/BatchSemesterModal";
import CurriculumFolderTree from "../components/CurriculumFolderTree";
import { useConfirm } from "../context/ConfirmContext";
import type { Subject } from "../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const SUBJECT_COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#F43F5E", "#06B6D4", "#64748B", "#EC4899",
];

const schema = z.object({
  name: z.string().min(1, "Subject/Course name is required"),
  degreeOrProgram: z.string().min(1, "Degree or program is required"),
  semesterOrTrack: z.string().min(1, "Semester or track is required"),
  examDate: z.string().min(1, "Exam or target date is required"),
  colorTag: z.string(),
});

type FormData = z.infer<typeof schema>;

export default function SubjectsPage() {
  const { confirm } = useConfirm();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"folder" | "grid">("folder");
  const [selectedTrack, setSelectedTrack] = useState<string>("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      colorTag: SUBJECT_COLORS[0],
      degreeOrProgram: "MCA",
      semesterOrTrack: "MCA 1ST SEM",
    },
  });

  const selectedColor = watch("colorTag");

  useEffect(() => {
    api
      .get("/subjects")
      .then((res) => setSubjects(res.data.data.subjects))
      .finally(() => setLoading(false));
  }, []);

  const createSubject = async (data: FormData) => {
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/subjects", data);
      setSubjects((prev) => [...prev, res.data.data.subject]);
      reset({
        colorTag: SUBJECT_COLORS[0],
        degreeOrProgram: "MCA",
        semesterOrTrack: "MCA 1ST SEM",
      });
      setAddOpen(false);
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSubject = async (subId: string, subName: string) => {
    const confirmed = await confirm({
      title: "Delete Course?",
      message: `Are you sure you want to permanently delete "${subName}"?\nThis will remove all topics, vault documents, and attached cloud notes.`,
      confirmText: "Delete Course",
      destructive: true,
    });
    if (!confirmed) return;

    try {
      await api.delete(`/subjects/${subId}`);
      setSubjects((prev) => prev.filter((s) => s._id !== subId));
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    }
  };

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
  };

  // Group by Semester / Track
  const availableTracks = Array.from(
    new Set(subjects.map((s) => s.semesterOrTrack || "Core Curriculum").filter(Boolean))
  );

  const filteredSubjects = subjects.filter(
    (s) => selectedTrack === "all" || (s.semesterOrTrack || "Core Curriculum") === selectedTrack
  );

  if (loading) {
    return (
      <div className="p-6 md:p-10 w-full animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-44 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-3.5 sm:p-6 md:p-10 w-full pb-24 md:pb-12 text-white">
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers size={14} className="text-[#0A84FF]" />
            <span className="text-[11px] font-mono text-[#0A84FF] uppercase tracking-wider">
              Course &amp; Curriculum Manager
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl text-white font-semibold tracking-tight">
            Subjects &amp; Learning Tracks
          </h1>
          <p className="text-xs text-ink-60 mt-0.5">
            Organized for productivity: curriculum syllabus, video resources, study documents &amp; reference books.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/8 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode("folder")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "folder"
                  ? "bg-[#0A84FF] text-white shadow-sm"
                  : "text-ink-60 hover:text-white"
              }`}
            >
              <FolderTree size={14} />
              <span>Folder View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-[#0A84FF] text-white shadow-sm"
                  : "text-ink-60 hover:text-white"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Grid View</span>
            </button>
          </div>

          <button
            onClick={() => setBatchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer border border-white/10"
          >
            <FolderPlus size={14} className="text-[#0A84FF]" />
            <span>Batch Setup</span>
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Course</span>
          </button>
        </div>
      </div>

      {viewMode === "folder" ? (
        <CurriculumFolderTree
          subjects={subjects}
          onDeleteSubject={handleDeleteSubject}
          onUpdateSubject={(updated) => {
            setSubjects((prev) =>
              prev.map((s) => (s._id === updated._id ? updated : s))
            );
          }}
        />
      ) : (
        <>
          {/* ── Track Selector Tabs ────────────────────────────────────────── */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedTrack("all")}
          className={`px-3.5 py-1.5 rounded-xl text-xs transition-colors shrink-0 cursor-pointer ${
            selectedTrack === "all"
              ? "bg-primary text-white font-medium shadow-md "
              : "bg-white/5 text-ink-60 hover:text-white hover:bg-white/10"
          }`}
        >
          All Courses ({subjects.length})
        </button>

        {availableTracks.map((track) => {
          const count = subjects.filter(
            (s) => (s.semesterOrTrack || "Core Curriculum") === track
          ).length;

          return (
            <button
              key={track}
              onClick={() => setSelectedTrack(track)}
              className={`px-3.5 py-1.5 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedTrack === track
                  ? "bg-primary text-white font-medium shadow-md "
                  : "bg-white/5 text-ink-60 hover:text-white hover:bg-white/10"
              }`}
            >
              <Folder size={12} />
              <span>{track}</span>
              <span className="text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Subjects Grid (Full Width Responsive) ──────────────────────── */}
      {filteredSubjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          message="No subjects found"
          subMessage="Add your first course or semester subject (e.g. DATA STRUCTURE, DBMS, CLOUD COMPUTING)."
          action={
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                onClick={() => setBatchOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer border border-white/10"
              >
                <FolderPlus size={15} className="text-[#0A84FF]" />
                <span>Batch Setup Semester (e.g. MCA)</span>
              </button>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
              >
                <Plus size={15} />
                <span>Add Single Subject</span>
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {filteredSubjects.map((s, idx) => {
              const days = daysUntil(s.examDate);
              const completedTopics = s.topics.filter((t) => t.completed).length;
              const totalTopics = s.topics.length;
              const progressPct =
                totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;
              const resourceCount = s.resources?.length || 0;
              const notesCount = s.notes?.length || 0;

              return (
                <motion.div
                  key={s._id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-[#141414] border border-white/8 hover:border-white/20 rounded-2xl p-5 flex flex-col justify-between transition-all group glow-card relative"
                >
                  {/* Color Accent Indicator */}
                  <div
                    className="absolute top-5 right-5 w-2.5 h-2.5 rounded-full ring-4 ring-white/5"
                    style={{ backgroundColor: s.colorTag }}
                  />

                  <div>
                    {/* Track Badge, Degree & Drive indicator */}
                    <div className="flex items-center justify-between gap-2 mb-2 pr-6 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.degreeOrProgram && (
                          <span className="text-[10px] font-mono font-medium text-white/80 uppercase px-1.5 py-0.5 rounded bg-white/10">
                            {s.degreeOrProgram}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-[#0A84FF] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-[#0A84FF]/20">
                          {s.semesterOrTrack || "Core Curriculum"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {s.driveFolderUrl && (
                          <span className="text-[10px] flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20" title="Google Drive Linked">
                            <Folder size={10} />
                            Drive
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-ink-60">
                          {days === 0 ? "Target today" : `${days}d target`}
                        </span>
                      </div>
                    </div>

                    {/* Course Title */}
                    <Link to={`/subjects/${s._id}`} className="group-hover:underline block">
                      <h3 className="text-base font-semibold text-white truncate mb-1">
                        {s.name}
                      </h3>
                    </Link>

                    {/* Meta Tags: Topics, Resources, Notes */}
                    <div className="flex items-center gap-3 text-xs text-ink-60 my-3 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Target size={12} className="text-emerald-400" />
                        {completedTopics}/{totalTopics} topics
                      </span>
                      <span className="flex items-center gap-1">
                        <Folder size={12} className="text-amber-400" />
                        {resourceCount} vault items
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText size={12} className="text-blue-400" />
                        {notesCount} notes
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-mono text-ink-60 mb-1">
                        <span>Syllabus Mastery</span>
                        <span className="text-white font-medium">{progressPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: s.colorTag }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Open Hub Button & Delete */}
                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between">
                    <Link
                      to={`/subjects/${s._id}`}
                      className="text-xs font-medium text-[#0A84FF] hover:underline flex items-center gap-1"
                    >
                      <span>Open Course Hub</span>
                      <ChevronRight size={13} />
                    </Link>

                    <button
                      onClick={() => handleDeleteSubject(s._id, s.name)}
                      className="p-1.5 text-ink-60 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete subject"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </>
  )}

      {/* ── Add Subject Modal ──────────────────────────────────────────── */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add Course / Subject">
        <form onSubmit={handleSubmit(createSubject)} className="space-y-4" noValidate>
          <div>
            <label className="block text-xs text-ink-60 mb-1.5">
              Course / Subject Name
            </label>
            <input
              {...register("name")}
              placeholder="e.g. Data Structures, Cloud Computing, Database Systems"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/50 focus:outline-none focus:border-primary/50"
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-ink-60 mb-1.5">
              Academic Program / Degree
            </label>
            <input
              {...register("degreeOrProgram")}
              placeholder="e.g. MCA, B.Tech, BCA, Career Track"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/50 focus:outline-none focus:border-[#0A84FF]/50"
            />
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {["MCA", "B.Tech", "BCA", "Job Prep"].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => setValue("degreeOrProgram", deg)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-ink-60 hover:text-white border border-white/8 cursor-pointer"
                >
                  {deg}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-60 mb-1.5">
              Semester or Track
            </label>
            <input
              {...register("semesterOrTrack")}
              placeholder="e.g. MCA 1ST SEM, MCA 2ND SEM, Semester 1"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/50 focus:outline-none focus:border-[#0A84FF]/50"
            />
            <div className="flex gap-1.5 mt-1.5 flex-wrap">
              {["MCA 1ST SEM", "MCA 2ND SEM", "MCA 3RD SEM", "MCA 4TH SEM"].map((sem) => (
                <button
                  key={sem}
                  type="button"
                  onClick={() => setValue("semesterOrTrack", sem)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/5 hover:bg-white/10 text-ink-60 hover:text-white border border-white/8 cursor-pointer"
                >
                  {sem}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-60 mb-1.5">
              Exam or Target Completion Date
            </label>
            <input
              type="date"
              {...register("examDate")}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-primary/50"
            />
            {errors.examDate && (
              <p className="mt-1 text-xs text-rose-400">{errors.examDate.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs text-ink-60 mb-2">Color Tag</label>
            <div className="flex gap-2 flex-wrap">
              {SUBJECT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("colorTag", color)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    selectedColor === color
                      ? "ring-2 ring-offset-2 ring-offset-[#11131F] ring-white scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-90 transition-all  disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Creating Course…" : "Create Course"}
          </button>
        </form>
      </Modal>

      {/* ── Batch Semester Creator Modal ─────────────────────────────── */}
      <BatchSemesterModal
        isOpen={batchOpen}
        onClose={() => setBatchOpen(false)}
        onCreated={(newCreated) => {
          setSubjects((prev) => [...prev, ...newCreated]);
        }}
      />
    </div>
  );
}
