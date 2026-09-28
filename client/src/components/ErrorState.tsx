import { AlertTriangle } from "lucide-react";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-deadline/10">
        <AlertTriangle className="size-7 text-deadline" />
      </div>

      <p className="max-w-sm font-body text-sm leading-relaxed text-ink">
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-lamp px-5 py-2 font-body text-sm font-medium text-white shadow-sm transition-colors hover:bg-lamp/90"
        >
          Try again
        </button>
      )}
    </div>
  );
}
