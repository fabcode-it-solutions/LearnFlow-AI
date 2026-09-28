import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  title: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (opts: { title: string; type: ToastType }) => void;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 3000;

const ICON_MAP: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

/** Tailwind classes keyed by toast type (design-token colours) */
const STYLE_MAP: Record<ToastType, { bg: string; icon: string; border: string }> = {
  success: {
    bg: "bg-confidence/10",
    icon: "text-confidence",
    border: "border-confidence/30",
  },
  error: {
    bg: "bg-deadline/10",
    icon: "text-deadline",
    border: "border-deadline/30",
  },
  info: {
    bg: "bg-lamp/10",
    icon: "text-lamp",
    border: "border-lamp/30",
  },
};

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/* ------------------------------------------------------------------ */
/*  Single toast card                                                  */
/* ------------------------------------------------------------------ */

function ToastCard({ t, onClose }: { t: Toast; onClose: (id: number) => void }) {
  const Icon = ICON_MAP[t.type];
  const style = STYLE_MAP[t.type];

  return (
    <motion.div
      layout
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${style.bg} ${style.border} min-w-[280px] max-w-[380px]`}
    >
      <Icon className={`mt-0.5 size-5 shrink-0 ${style.icon}`} />

      <p className="flex-1 font-body text-sm leading-snug text-ink">{t.title}</p>

      <button
        type="button"
        onClick={() => onClose(t.id)}
        className="shrink-0 rounded-md p-0.5 text-ink-60 transition-colors hover:text-ink"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ---- helpers --------------------------------------------------- */

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, type }: { title: string; type: ToastType }) => {
      const id = nextId++;

      setToasts((prev) => {
        const next = [...prev, { id, title, type }];
        // Keep only the newest MAX_VISIBLE toasts
        return next.length > MAX_VISIBLE ? next.slice(-MAX_VISIBLE) : next;
      });

      // Auto-dismiss after timeout
      setTimeout(() => removeToast(id), AUTO_DISMISS_MS);
    },
    [removeToast],
  );

  /* ---- render ---------------------------------------------------- */

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container — fixed bottom-right */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col-reverse gap-2"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastCard key={t.id} t={t} onClose={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>");
  }
  return ctx;
}
