import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, className = "max-w-md", children }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <div className={`bg-[#141414] border border-white/10 rounded-2xl shadow-2xl w-full p-6 relative text-white ${className}`}>
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-ink-60 hover:text-white transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
              <h2
                id="modal-title"
                className="text-lg text-white font-semibold mb-4"
              >
                {title}
              </h2>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

