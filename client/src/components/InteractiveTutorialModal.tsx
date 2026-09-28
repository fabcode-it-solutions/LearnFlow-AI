import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Scan,
  Brain,
  Mountain,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  ArrowRight,
} from "lucide-react";
import { LogoIcon } from "./Logo";

interface InteractiveTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
}

interface StepInfo {
  id: number;
  tag: string;
  title: string;
  subtitle: string;
  description: string[];
  tips: string;
  icon: React.ElementType;
  accentColor: string;
  accentBg: string;
  ctaText?: string;
  ctaLink?: string;
}

const TUTORIAL_STEPS: StepInfo[] = [
  {
    id: 1,
    tag: "Syllabus AI v2",
    title: "Smart Syllabus Parser (OCR & PDF)",
    subtitle: "Turn dense MCA, B.Tech, or university syllabi into structured units",
    description: [
      "Upload any syllabus image, scanned photo, or multi-page PDF document directly.",
      "Integrated OCR extracts Course Title, Semester, Units (I through IV), Sub-units, and Topics automatically.",
      "Interactive Confidence Survey: before saving, rate your knowledge (1–5) so the AI knows exactly where you stand.",
    ],
    tips: "Tip: You can re-parse or sync syllabus text anytime from the course Curriculum tab.",
    icon: Scan,
    accentColor: "#0A84FF",
    accentBg: "bg-blue-500/10 border-blue-500/20 text-blue-400",
    ctaText: "Explore Courses",
    ctaLink: "/subjects",
  },
  {
    id: 2,
    tag: "Pedagogical Engine",
    title: "Cognitive AI Brain",
    subtitle: "No random studying — structured curriculum progression",
    description: [
      "Strict Unit-by-Unit Flow: Unit 1 foundational principles are scheduled before Unit 4 advanced topics.",
      "Prerequisite Mastery: Prioritizes low-confidence topics first within each unit before stepping forward.",
      "Transparent AI Rationales: Every generated agenda item explains WHY you are studying this topic today.",
    ],
    tips: "Tip: In Study Plan, view the AI Rationale badge on each card to understand its pedagogical priority.",
    icon: Brain,
    accentColor: "#A855F7",
    accentBg: "bg-purple-500/10 border-purple-500/20 text-purple-400",
    ctaText: "View Study Plan",
    ctaLink: "/plan",
  },
  {
    id: 3,
    tag: "Alpine Gamification",
    title: "Mountain Expedition Quest Roadmap",
    subtitle: "Transform your syllabus into an epic alpine climb from Basecamp to Summit",
    description: [
      "Follow a scenic switchback mountain road with unit gates, waypoints, and milestone camps.",
      "Live Elevation & Altitude Meter: watch your elevation rise toward 8,848m summit with weather indicators!",
      "Earn +150 XP per topic, unlock Level ranks, and celebrate with summit confetti upon 100% completion.",
    ],
    tips: "Tip: Switch between List and Roadmap views anytime using the toggle on the Study Plan page.",
    icon: Mountain,
    accentColor: "#10B981",
    accentBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    ctaText: "Explore Roadmap",
    ctaLink: "/plan",
  },
  {
    id: 4,
    tag: "Drive & Media Vault",
    title: "Google Drive Sync & On-Site Reader",
    subtitle: "Read Drive PDFs and watch YouTube tutorials without leaving the app",
    description: [
      "Link your Google Drive subject folder, textbook PDFs, and reference slide decks directly to your vault.",
      "Built-in On-Site Reader: preview Drive notes and documents in-app so you never lose your focus.",
      "Instant 1-Click YouTube button on every topic to pull up curated video lectures instantly.",
    ],
    tips: "Tip: Click 'View Doc' on any Drive resource or note link to read it immediately on-site.",
    icon: HardDrive,
    accentColor: "#F59E0B",
    accentBg: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  },
  {
    id: 5,
    tag: "Security & Storage",
    title: "Cloud Notes & Storage Management",
    subtitle: "Safe deletion safeguards and lean database performance",
    description: [
      "Safe Removal Guards: Every delete action across Today, Schedule, Notes, and Curriculum requires explicit confirmation.",
      "Plan Reset & Storage Optimization: Clear expired plans or reset schedules in 1-click to keep database space lean.",
      "Rich Cloud Notes: Write markdown summaries with auto-detected Drive URLs and instant cloud backups.",
    ],
    tips: "Tip: Click 'Clear Plan' in Study Plan if you ever want to regenerate a brand new schedule from scratch.",
    icon: ShieldCheck,
    accentColor: "#EC4899",
    accentBg: "bg-pink-500/10 border-pink-500/20 text-pink-400",
    ctaText: "Open Notes Vault",
    ctaLink: "/notes",
  },
];

export default function InteractiveTutorialModal({
  isOpen,
  onClose,
  initialStep = 0,
}: InteractiveTutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [neverShowAgain, setNeverShowAgain] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(initialStep);
    }
  }, [isOpen, initialStep]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleDismiss();
      } else if (e.key === "ArrowRight") {
        if (currentStep < TUTORIAL_STEPS.length - 1) {
          setCurrentStep((prev) => prev + 1);
        }
      } else if (e.key === "ArrowLeft") {
        if (currentStep > 0) {
          setCurrentStep((prev) => prev - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep]);

  const handleDismiss = () => {
    localStorage.setItem("learnflow_tutorial_completed", "true");
    if (neverShowAgain) {
      localStorage.setItem("learnflow_tutorial_never_show", "true");
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-[#090A0F]/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative z-10 w-full max-w-2xl bg-[#141414] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Top Bar with Step Indicators */}
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogoIcon size={32} />
              <div>
                <h3 className="text-sm font-semibold text-white tracking-tight">
                  LearnFlow v2 Feature Guide
                </h3>
                <p className="text-[11px] font-mono text-ink-60">
                  Step {step.id} of {TUTORIAL_STEPS.length} — {step.tag}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="p-2 rounded-xl text-ink-60 hover:text-white hover:bg-white/5 transition-colors"
              title="Close tour"
            >
              <X size={18} />
            </button>
          </div>

          {/* Interactive Progress Bar */}
          <div className="px-6 pt-4 flex gap-1.5">
            {TUTORIAL_STEPS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  idx === currentStep
                    ? "bg-[#0A84FF] shadow-sm shadow-[#0A84FF]/50"
                    : idx < currentStep
                    ? "bg-[#0A84FF]/40"
                    : "bg-white/10 hover:bg-white/20"
                }`}
                title={`Jump to ${s.title}`}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="p-6 md:p-8 flex-1 min-h-[300px] flex flex-col justify-between">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Header Badge & Title */}
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${step.accentBg}`}
                  >
                    <Icon size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 text-ink-60 border border-white/10">
                      {step.tag}
                    </span>
                    <h2 className="font-display text-xl md:text-2xl text-white font-bold mt-1 tracking-tight">
                      {step.title}
                    </h2>
                    <p className="font-body text-xs text-slate-400 mt-0.5">
                      {step.subtitle}
                    </p>
                  </div>
                </div>

                {/* Bullet Features */}
                <div className="space-y-2.5 pt-2">
                  {step.description.map((desc, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                      <CheckCircle2
                        size={15}
                        className="text-emerald-400 shrink-0 mt-0.5"
                      />
                      <span className="leading-relaxed">{desc}</span>
                    </div>
                  ))}
                </div>

                {/* Helpful Tip Box */}
                <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/8 text-[11px] text-slate-400 font-body flex items-center justify-between">
                  <span>{step.tips}</span>
                  {step.ctaLink && (
                    <button
                      onClick={() => {
                        handleDismiss();
                        navigate(step.ctaLink!);
                      }}
                      className="ml-3 shrink-0 text-[#0A84FF] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>{step.ctaText}</span>
                      <ArrowRight size={11} />
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom Actions Bar */}
          <div className="px-6 py-4 border-t border-white/5 bg-[#0D0F18]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Don't show again toggle */}
            <label className="flex items-center gap-2 text-xs text-ink-60 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={neverShowAgain}
                onChange={(e) => setNeverShowAgain(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-white/5 border-white/20 text-[#0A84FF] focus:ring-0"
              />
              <span>Don't show automatically on start</span>
            </label>

            {/* Prev / Next controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold text-ink-60 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ChevronLeft size={14} />
                <span>Back</span>
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-200 active:scale-95 shadow-md transition-all"
              >
                <span>
                  {currentStep === TUTORIAL_STEPS.length - 1
                    ? "Got It, Let's Study!"
                    : "Next Step"}
                </span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
