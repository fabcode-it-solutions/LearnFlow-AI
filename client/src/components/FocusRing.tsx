import { motion } from "framer-motion";

interface FocusRingProps {
  pct: number; // 0–100
  size?: number;
  label?: string;
}

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The centerpiece of the Dashboard.
 * Animates from 0 → pct once on mount. Never re-animates on re-renders.
 * PRD requirement: "fills from 0 to current % on load, once — not on every render."
 */
export default function FocusRing({ pct, size = 140, label }: FocusRingProps) {
  const clampedPct = Math.min(Math.max(pct, 0), 100);
  const targetOffset = CIRCUMFERENCE - (clampedPct / 100) * CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background track */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          className="rotate-[-90deg]"
          aria-label={`${clampedPct}% complete`}
          role="img"
        >
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            stroke="#E8A23C"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            initial={{ strokeDashoffset: CIRCUMFERENCE }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-medium text-fog">
            {clampedPct}%
          </span>
          {label && (
            <span className="font-body text-xs text-ink-60 mt-0.5">{label}</span>
          )}
        </div>
      </div>
    </div>
  );
}

