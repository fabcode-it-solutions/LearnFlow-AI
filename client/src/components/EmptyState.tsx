import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  subMessage?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  message,
  subMessage,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-ink/8 flex items-center justify-center mb-5">
        <Icon size={24} strokeWidth={1.5} className="text-ink-60" />
      </div>
      <p className="font-display text-xl text-ink font-semibold mb-2">{message}</p>
      {subMessage && (
        <p className="font-body text-sm text-ink-60 max-w-xs">{subMessage}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

