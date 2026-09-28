import { useState } from "react";
import { FolderPlus, Layers, Calendar, Check, AlertCircle } from "lucide-react";
import Modal from "./Modal";
import api from "../lib/api";
import { parseApiError } from "../lib/error-handler";
import type { Subject } from "../types";

interface BatchSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newSubjects: Subject[]) => void;
}

const MCA_PRESETS = [
  {
    semester: "MCA 1ST SEM",
    degree: "MCA",
    subjects: ["CLOUD COMPUTING", "COMPUTER NETWORKS", "DATA STRUCTURE", "DBMS", "JAVA"],
  },
  {
    semester: "MCA 2ND SEM",
    degree: "MCA",
    subjects: ["WEB TECHNOLOGIES", "OPERATING SYSTEMS", "SOFTWARE ENGINEERING", "PYTHON", "ALGORITHMS"],
  },
  {
    semester: "JOB PREP",
    degree: "Career",
    subjects: ["DSA & LEETCODE", "SYSTEM DESIGN", "SQL & DATABASES", "FULL STACK REACT & NODE", "CORE CS FUNDAMENTALS"],
  },
];

export default function BatchSemesterModal({
  isOpen,
  onClose,
  onCreated,
}: BatchSemesterModalProps) {
  const [degreeOrProgram, setDegreeOrProgram] = useState("MCA");
  const [semesterOrTrack, setSemesterOrTrack] = useState("MCA 1ST SEM");
  const [subjectText, setSubjectText] = useState(
    "CLOUD COMPUTING\nCOMPUTER NETWORKS\nDATA STRUCTURE\nDBMS\nJAVA"
  );
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().split("T")[0];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsedSubjectNames = subjectText
    .split(/[\n,]/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterOrTrack.trim()) {
      setError("Please enter a semester or track name.");
      return;
    }
    if (parsedSubjectNames.length === 0) {
      setError("Please enter at least one subject name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await api.post("/subjects/batch", {
        semesterOrTrack: semesterOrTrack.trim(),
        degreeOrProgram: degreeOrProgram.trim() || "General",
        subjects: parsedSubjectNames,
        examDate,
      });

      onCreated(res.data.data.subjects);
      onClose();
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (preset: typeof MCA_PRESETS[0]) => {
    setSemesterOrTrack(preset.semester);
    setDegreeOrProgram(preset.degree);
    setSubjectText(preset.subjects.join("\n"));
    setError("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Semester Setup"
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-white" noValidate>
        {/* Banner */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/8 text-xs text-ink-60 flex items-start gap-2.5">
          <FolderPlus size={16} className="text-[#0A84FF] shrink-0 mt-0.5" />
          <span>
            Quickly set up your entire semester curriculum. Adds all courses under your academic program with automatic color tags.
          </span>
        </div>

        {/* Quick Presets */}
        <div>
          <span className="block text-[11px] font-mono text-ink-60 uppercase tracking-wider mb-1.5">
            Quick 1-Click Presets:
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {MCA_PRESETS.map((p) => (
              <button
                key={p.semester}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  semesterOrTrack === p.semester
                    ? "bg-[#0A84FF]/20 border-[#0A84FF]/50 text-white font-medium"
                    : "bg-white/5 border-white/10 text-ink-60 hover:text-white hover:bg-white/10"
                }`}
              >
                <Layers size={12} className="text-[#0A84FF]" />
                <span>{p.semester}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Degree & Semester Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1">
              Program / Degree
            </label>
            <input
              type="text"
              value={degreeOrProgram}
              onChange={(e) => setDegreeOrProgram(e.target.value)}
              placeholder="e.g. MCA, B.Tech, Job Prep"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/40 focus:outline-none focus:border-[#0A84FF]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1">
              Semester / Term
            </label>
            <input
              type="text"
              value={semesterOrTrack}
              onChange={(e) => setSemesterOrTrack(e.target.value)}
              placeholder="e.g. MCA 1ST SEM"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/40 focus:outline-none focus:border-[#0A84FF]/50"
              required
            />
          </div>
        </div>

        {/* Subjects list */}
        <div>
          <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Subject Names (1 per line or comma-separated)</span>
            <span className="text-[10px] text-[#0A84FF]">
              {parsedSubjectNames.length} subjects detected
            </span>
          </label>
          <textarea
            value={subjectText}
            onChange={(e) => setSubjectText(e.target.value)}
            rows={5}
            placeholder="CLOUD COMPUTING&#10;COMPUTER NETWORKS&#10;DATA STRUCTURE&#10;DBMS&#10;JAVA"
            className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ink-60/40 focus:outline-none focus:border-[#0A84FF]/50 font-mono resize-y"
            required
          />
        </div>

        {/* Target Exam Date */}
        <div>
          <label className="block text-xs font-mono text-ink-60 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Calendar size={12} />
            <span>Target Exam / Semester End Date</span>
          </label>
          <input
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[#0A84FF]/50"
            required
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/8">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-ink-60 hover:text-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || parsedSubjectNames.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
          >
            <Check size={14} />
            <span>
              {saving
                ? "Creating Semester…"
                : `Create ${parsedSubjectNames.length} Courses in ${semesterOrTrack || "Semester"}`}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
