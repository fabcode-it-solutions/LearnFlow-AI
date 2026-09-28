import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, X, ExternalLink, CheckCircle2, Youtube } from "lucide-react";

interface FocusPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicTitle?: string;
  subjectName?: string;
  resourceQuery?: string;
  resourceLink?: string;
  onComplete?: () => void;
}

export default function FocusPlayerModal({
  isOpen,
  onClose,
  topicTitle = "Deep Focus Session",
  subjectName = "Self Study",
  resourceQuery,
  resourceLink,
  onComplete,
}: FocusPlayerModalProps) {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [notes, setNotes] = useState("");

  // Reset timer when duration changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSecondsLeft(durationMinutes * 60);
      setIsRunning(false);
    }
  }, [isOpen, durationMinutes]);

  // Countdown interval
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isRunning && secondsLeft > 0) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isRunning) {
      setIsRunning(false);
      // Play subtle chime or notify
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("Focus Session Complete! 🎉", { body: `Great job on ${topicTitle}` });
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, secondsLeft, topicTitle]);

  const toggleRunning = () => setIsRunning((prev) => !prev);
  const resetTimer = () => {
    setIsRunning(false);
    setSecondsLeft(durationMinutes * 60);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / (durationMinutes * 60);

  const youtubeUrl = resourceLink || (resourceQuery
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(resourceQuery)}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${subjectName} ${topicTitle} tutorial`)}`);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-[#11131F] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 relative pointer-events-auto overflow-hidden">
              {/* Decorative ambient glow */}
              <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-ink-60 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>

              {/* Session Header */}
              <div className="mb-6">
                <span className="text-[11px] font-mono text-ink-60 uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {subjectName}
                </span>
                <h2 className="font-display text-xl text-white font-semibold mt-2 truncate">
                  {topicTitle}
                </h2>
              </div>

              {/* Timer Progress Ring & Display */}
              <div className="flex flex-col items-center justify-center my-6">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="url(#timerGradient)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - progress)}
                      className="transition-all duration-300"
                    />
                    <defs>
                      <linearGradient id="timerGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#FAFAFA" />
                        <stop offset="100%" stopColor="#A1A1AA" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute flex flex-col items-center">
                    <span className="font-mono text-4xl text-white font-semibold tracking-tight">
                      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                    </span>
                    <span className="text-[11px] font-body text-ink-60 uppercase tracking-widest mt-1">
                      {isRunning ? "Focusing" : "Paused"}
                    </span>
                  </div>
                </div>

                {/* Duration Presets */}
                <div className="flex gap-2 mt-4">
                  {[15, 25, 45, 60].map((m) => (
                    <button
                      key={m}
                      onClick={() => setDurationMinutes(m)}
                      className={`px-3 py-1 rounded-lg font-mono text-xs transition-colors ${
                        durationMinutes === m
                          ? "bg-white text-zinc-950 font-bold"
                          : "bg-white/5 text-ink-60 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-3 my-4">
                <button
                  onClick={toggleRunning}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-zinc-950 font-body font-semibold text-sm hover:bg-zinc-200 active:scale-95 transition-all shadow-md"
                >
                  {isRunning ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                  {isRunning ? "Pause" : "Start Focus"}
                </button>

                <button
                  onClick={resetTimer}
                  className="p-2.5 rounded-xl bg-white/5 text-ink-60 hover:text-white hover:bg-white/10 transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={16} />
                </button>

                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-body font-medium transition-colors"
                >
                  <Youtube size={15} />
                  <span>Tutorial</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              {/* Session Scratchpad */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <label className="block text-xs font-body text-ink-60 mb-1.5">
                  Quick Session Scratchpad / Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key insights, questions, or timestamps..."
                  className="w-full px-3 py-2 rounded-xl bg-black/30 border border-white/10 font-body text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              {/* Mark Complete Action */}
              {onComplete && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => {
                      onComplete();
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 text-xs font-body font-medium transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    <span>Complete &amp; Log Task</span>
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

