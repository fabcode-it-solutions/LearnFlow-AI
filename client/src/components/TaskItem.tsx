import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PlanEntry } from "../types";
import api from "../lib/api";

interface TaskItemProps {
  entry: PlanEntry;
  onUpdate: (entryId: string, status: PlanEntry["status"]) => void;
}

export default function TaskItem({ entry, onUpdate }: TaskItemProps) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (loading || entry.status === "done") return;
    setLoading(true);
    try {
      await api.patch(`/plan/entries/${entry._id}`, { status: "done" });
      onUpdate(entry._id, "done");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleMiss = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await api.patch(`/plan/entries/${entry._id}`, { status: "missed" });
      onUpdate(entry._id, "missed");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isDone = entry.status === "done";
  const isMissed = entry.status === "missed";

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={`flex items-center gap-3 py-3 border-b border-ink/8 last:border-0 ${
          isMissed ? "opacity-50" : ""
        }`}
      >
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={loading || isDone || isMissed}
          aria-label={isDone ? "Task done" : "Mark task done"}
          className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
            isDone
              ? "bg-confidence border-confidence"
              : "border-ink-60 hover:border-lamp"
          }`}
        >
          {isDone && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
            >
              <path
                d="M1 4l3 3 5-6"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          )}
        </button>

        {/* Subject chip */}
        <span
          className="text-[11px] font-body font-medium px-1.5 py-0.5 rounded"
          style={{
            backgroundColor: entry.subjectColor + "22",
            color: entry.subjectColor,
          }}
        >
          {entry.subjectName}
        </span>

        {/* Topic title */}
        <span
          className={`flex-1 font-body text-sm ${
            isDone ? "line-through text-ink-60" : "text-ink"
          }`}
        >
          {entry.topicTitle}
        </span>

        {/* Time estimate */}
        <span className="font-mono text-xs text-ink-60 shrink-0">
          {entry.estimatedMinutes} min
        </span>

        {/* Miss button */}
        {!isDone && !isMissed && (
          <button
            onClick={handleMiss}
            disabled={loading}
            title="Mark as missed"
            className="text-ink-60 hover:text-deadline text-xs font-body transition-colors"
          >
            ✕
          </button>
        )}

        {isMissed && (
          <span className="text-deadline text-xs font-body">Missed</span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

