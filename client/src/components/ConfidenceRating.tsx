import { Star } from "lucide-react";

interface ConfidenceRatingProps {
  value: number; // 1–5
  onChange?: (val: number) => void;
  readonly?: boolean;
  size?: number;
}

const LABELS = ["", "Very low", "Low", "Moderate", "Good", "Mastered"];

export default function ConfidenceRating({
  value,
  onChange,
  readonly = false,
  size = 18,
}: ConfidenceRatingProps) {
  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Confidence rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} — ${LABELS[star]}`}
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className={`transition-colors duration-100 ${
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          }`}
        >
          <Star
            size={size}
            strokeWidth={1.5}
            className={
              star <= value
                ? "fill-lamp stroke-lamp"
                : "fill-transparent stroke-ink-60"
            }
          />
        </button>
      ))}
      {!readonly && (
        <span className="ml-2 text-xs font-body text-ink-60">
          {LABELS[value] || ""}
        </span>
      )}
    </div>
  );
}

