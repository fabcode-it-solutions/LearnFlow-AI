import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { parseApiError } from "../lib/error-handler";
import ConfidenceRating from "../components/ConfidenceRating";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import Logo from "../components/Logo";

// Step 1: Subject form
const step1Schema = z.object({
  subjectName: z.string().min(1, "Subject/Course name is required"),
  semesterOrTrack: z.string().min(1, "Semester or track is required"),
  examDate: z.string().min(1, "Exam or target date is required"),
});

type Step1Data = z.infer<typeof step1Schema>;

const STEPS = ["Add Subject", "Add Topics", "Daily Hours"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [step, setStep] = useState(0);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 2: Topics
  const [topics, setTopics] = useState<
    Array<{ title: string; confidenceScore: number; estimatedMinutes: number }>
  >([
    { title: "", confidenceScore: 3, estimatedMinutes: 30 },
    { title: "", confidenceScore: 2, estimatedMinutes: 45 },
  ]);

  // Step 3: Daily hours
  const [dailyHours, setDailyHours] = useState(2);

  // Step 1 form
  const {
    register: r1,
    handleSubmit: hs1,
    formState: { errors: e1 },
  } = useForm<Step1Data>({ resolver: zodResolver(step1Schema) });

  // ── Step 1: Create subject ────────────────────────────────────────────────
  const submitStep1 = async (data: Step1Data) => {
    setSaving(true);
    setError("");
    try {
      const res = await api.post("/subjects", {
        name: data.subjectName,
        semesterOrTrack: data.semesterOrTrack || "Core Curriculum",
        examDate: data.examDate,
        colorTag: "#3B82F6",
      });
      setSubjectId(res.data.data.subject._id);
      setSubjectName(data.subjectName);
      setStep(1);
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2: Save topics ───────────────────────────────────────────────────
  const submitStep2 = async () => {
    if (!subjectId) return;
    const valid = topics.every((t) => t.title.trim().length > 0);
    if (!valid) {
      setError("All topic titles must be filled in");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await Promise.all(
        topics.map((topic) => api.post(`/subjects/${subjectId}/topics`, topic))
      );
      setStep(2);
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  // ── Step 3: Set daily hours + complete onboarding ─────────────────────────
  const submitStep3 = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch("/auth/me", {
        dailyStudyHours: dailyHours,
        onboardingComplete: true,
      });

      // Generate the initial study plan
      await api.post("/plan/generate", { dailyHoursAvailable: dailyHours });

      updateUser({ dailyStudyHours: dailyHours, onboardingComplete: true });
      navigate("/");
    } catch (err: unknown) {
      setError(parseApiError(err).message);
    } finally {
      setSaving(false);
    }
  };

  const addTopic = () =>
    setTopics((prev) => [
      ...prev,
      { title: "", confidenceScore: 3, estimatedMinutes: 30 },
    ]);

  const removeTopic = (i: number) =>
    setTopics((prev) => prev.filter((_, idx) => idx !== i));

  const updateTopic = (i: number, field: string, value: string | number) =>
    setTopics((prev) =>
      prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t))
    );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="flex justify-center mb-8">
          <Logo size={40} showTagline={true} />
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-10 justify-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-semibold transition-colors ${
                  i < step
                    ? "bg-emerald-500 text-white"
                    : i === step
                    ? "bg-[#0A84FF] text-white font-bold"
                    : "bg-white/5 text-slate-500 border border-white/10"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs hidden sm:block ${
                  i === step ? "text-white font-medium" : "text-slate-500"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-px ${i < step ? "bg-emerald-500" : "bg-white/10"}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-[#141414] rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10">
          {/* ── Step 1 ────────────────────────────────────────────────────── */}
          {step === 0 && (
            <form onSubmit={hs1(submitStep1)} noValidate className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-[#0A84FF] uppercase tracking-wider">
                  Step 1 of 3
                </span>
                <h2 className="text-2xl text-white font-semibold mt-1">
                  Add your first course or subject
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  e.g. DATA STRUCTURE, DBMS, or Fullstack Bootcamp. You can add more later.
                </p>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-1.5">
                  Course / Subject Name
                </label>
                <input
                  {...r1("subjectName")}
                  placeholder="e.g. DATA STRUCTURE, CLOUD COMPUTING"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20"
                />
                {e1.subjectName && (
                  <p className="mt-1 text-xs text-rose-400 font-body">{e1.subjectName.message}</p>
                )}
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-1.5">
                  Semester or Learning Track
                </label>
                <input
                  {...r1("semesterOrTrack")}
                  placeholder="e.g. Semester 1, Core Studies, Certification Track"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-1.5">
                  Exam or Target Date
                </label>
                <input
                  type="date"
                  {...r1("examDate")}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white focus:outline-none focus:border-white/20"
                />
                {e1.examDate && (
                  <p className="mt-1 text-xs text-rose-400 font-body">{e1.examDate.message}</p>
                )}
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#0A84FF] text-white font-semibold text-xs hover:opacity-90 active:scale-95 transition-all  disabled:opacity-50 mt-2 cursor-pointer"
              >
                {saving ? "Saving…" : "Next — Add Topics"}
              </button>
            </form>
          )}

          {/* ── Step 2 ────────────────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-mono text-[#0A84FF] uppercase tracking-wider">
                  Step 2 of 3 · {subjectName}
                </span>
                <h2 className="text-2xl text-white font-semibold mt-1">
                  Add syllabus topics
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Rate your initial confidence for each topic to calibrate the AI scheduler.
                </p>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {topics.map((topic, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        value={topic.title}
                        onChange={(e) => updateTopic(i, "title", e.target.value)}
                        placeholder={`Topic ${i + 1} (e.g. Stacks & Queues, BST)`}
                        className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20"
                      />
                      {topics.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTopic(i)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="text-[10px] font-mono text-slate-400 mb-1">
                          Confidence
                        </p>
                        <ConfidenceRating
                          value={topic.confidenceScore}
                          onChange={(v) => updateTopic(i, "confidenceScore", v)}
                          size={14}
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400">Est:</span>
                        <select
                          value={topic.estimatedMinutes}
                          onChange={(e) =>
                            updateTopic(i, "estimatedMinutes", Number(e.target.value))
                          }
                          className="px-2 py-1 rounded-lg border border-white/10 bg-[#141414] text-xs font-mono text-white focus:outline-none"
                        >
                          <option value={15}>15m</option>
                          <option value={30}>30m</option>
                          <option value={45}>45m</option>
                          <option value={60}>60m</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addTopic}
                className="w-full py-2 rounded-xl border border-dashed border-white/20 text-xs text-slate-400 hover:text-white hover:border-white/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Add another topic</span>
              </button>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                onClick={submitStep2}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#0A84FF] text-white font-semibold text-xs hover:opacity-90 active:scale-95 transition-all  disabled:opacity-50 mt-2 cursor-pointer"
              >
                {saving ? "Saving topics…" : "Next — Set Daily Target"}
              </button>
            </div>
          )}

          {/* ── Step 3 ────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <span className="text-[10px] font-mono text-[#0A84FF] uppercase tracking-wider">
                  Step 3 of 3
                </span>
                <h2 className="text-2xl text-white font-semibold mt-1">
                  Daily study availability
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  How many hours can you realistically dedicate to studying each day?
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
                <div className="text-center">
                  <span className="font-mono text-4xl font-bold text-white">
                    {dailyHours}
                  </span>
                  <span className="text-sm text-slate-400 ml-2">
                    hour{dailyHours !== 1 ? "s" : ""} / day
                  </span>
                </div>

                <input
                  type="range"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={dailyHours}
                  onChange={(e) => setDailyHours(Number(e.target.value))}
                  className="w-full accent-[#0A84FF]"
                />

                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>30 min</span>
                  <span>4 hours</span>
                  <span>8 hours</span>
                </div>
              </div>

              {error && <p className="text-xs text-rose-400">{error}</p>}

              <button
                onClick={submitStep3}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0A84FF] text-white font-semibold text-xs hover:opacity-90 active:scale-95 transition-all  disabled:opacity-50 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>{saving ? "Generating your plan…" : "Generate My Study Plan"}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
