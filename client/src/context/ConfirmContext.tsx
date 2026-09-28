import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
  }>({
    isOpen: false,
    options: { message: "" },
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts: ConfirmOptions =
      typeof options === "string" ? { message: options } : options;

    setDialogState({
      isOpen: true,
      options: {
        title: opts.title ?? (opts.destructive !== false ? "Confirm Action" : "Confirmation"),
        message: opts.message,
        confirmText: opts.confirmText ?? (opts.destructive !== false ? "Remove" : "Confirm"),
        cancelText: opts.cancelText ?? "Cancel",
        destructive: opts.destructive !== false,
      },
    });

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleClose = (choice: boolean) => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (resolverRef.current) {
      resolverRef.current(choice);
      resolverRef.current = null;
    }
  };

  const { isOpen, options } = dialogState;
  const isDestructive = options.destructive !== false;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleClose(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            {/* Modal Card */}
            <motion.div
              role="alertdialog"
              aria-modal="true"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative z-10 w-full max-w-md bg-[#141414] border border-white/10 rounded-2xl shadow-2xl p-6 text-white overflow-hidden"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-4">
                {/* Icon Badge */}
                <div
                  className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center border ${
                    isDestructive
                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      : "bg-[#0A84FF]/10 border-[#0A84FF]/20 text-[#0A84FF]"
                  }`}
                >
                  {isDestructive ? <Trash2 size={20} /> : <AlertTriangle size={20} />}
                </div>

                {/* Content */}
                <div className="flex-1 pr-4">
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    {options.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-ink-60 leading-relaxed font-body whitespace-pre-wrap">
                    {options.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-ink-60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {options.cancelText}
                </button>

                <button
                  type="button"
                  autoFocus
                  onClick={() => handleClose(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer ${
                    isDestructive
                      ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30"
                      : "bg-[#0A84FF] hover:opacity-90 text-white shadow-blue-900/30"
                  }`}
                >
                  {options.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmContextValue {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a <ConfirmProvider>");
  }
  return ctx;
}
