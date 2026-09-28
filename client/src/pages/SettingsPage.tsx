import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Trash2, Save, Clock, User, ShieldCheck, HelpCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import Modal from "../components/Modal";
import { useToast } from "../context/ToastContext";

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name || "");
  const [dailyHours, setDailyHours] = useState(user?.dailyStudyHours || 2);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await api.patch("/auth/me", { name, dailyStudyHours: dailyHours });
      updateUser({ name, dailyStudyHours: dailyHours });
      setSaved(true);
      toast({ title: "Preferences saved successfully", type: "success" });
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save settings");
      toast({ title: "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete("/auth/me");
      await logout();
      navigate("/signup");
    } catch {
      setError("Failed to delete account");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 md:p-10 max-w-2xl pb-24 md:pb-12 text-white"
    >
      <h1 className="text-2xl font-semibold mb-1.5">Settings</h1>
      <p className="text-xs text-[#8E8E93] mb-8">
        Manage your profile, study schedule, and account preferences.
      </p>

      {/* Profile section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <User size={14} className="text-[#8E8E93]" />
          <h2 className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-medium">
            Profile
          </h2>
        </div>
        <div className="space-y-4 p-5 bg-[#1C1C1E] rounded-2xl border border-white/[0.09]">
          <div>
            <label className="block text-xs text-[#8E8E93] mb-1.5">
              Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-xs text-white focus:outline-none focus:border-[#0A84FF]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8E8E93] mb-1.5">
              Email Address
            </label>
            <input
              value={user?.email}
              disabled
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-[#8E8E93] cursor-not-allowed font-mono"
            />
            <p className="mt-1.5 text-[11px] text-[#8E8E93]/60 flex items-center gap-1">
              <ShieldCheck size={12} className="text-[#30D158]" />
              Primary authenticated account email.
            </p>
          </div>
        </div>
      </section>

      {/* Study schedule section */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={14} className="text-[#8E8E93]" />
          <h2 className="text-[11px] text-[#8E8E93] uppercase tracking-widest font-medium">
            Daily Study Target
          </h2>
        </div>
        <div className="p-5 bg-[#1C1C1E] rounded-2xl border border-white/[0.09] space-y-4">
          <label className="block text-xs text-[#8E8E93]">
            Maximum study hours per calendar day
          </label>
          <div className="text-center">
            <span className="font-mono text-4xl font-bold text-white">
              {dailyHours}
            </span>
            <span className="text-sm text-[#8E8E93] ml-2">
              hour{dailyHours !== 1 ? "s" : ""} / day
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={8}
            step={0.5}
            value={dailyHours}
            onChange={(e) => setDailyHours(Number(e.target.value))}
            className="w-full accent-[#0A84FF]"
          />
          <div className="flex justify-between text-[11px] font-mono text-[#8E8E93]/60">
            <span>30m</span>
            <span>4 hours</span>
            <span>8 hours</span>
          </div>
        </div>
      </section>

      {/* Product Tour & Guide */}
      <section className="bg-[#1C1C1E] border border-white/[0.09] rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1.5">
          <HelpCircle size={15} className="text-[#8E8E93]" />
          <h2 className="text-sm font-semibold text-white">
            App Guide & Walkthrough
          </h2>
        </div>
        <p className="text-xs text-[#8E8E93] mb-4">
          Replay the interactive walkthrough anytime to explore features.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem("learnflow_tutorial_never_show");
            localStorage.removeItem("learnflow_tutorial_completed");
            window.dispatchEvent(new CustomEvent("open-learnflow-tutorial"));
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.09] hover:border-white/18 text-white text-xs font-medium transition-all hover:bg-white/[0.09] cursor-pointer"
        >
          <HelpCircle size={13} className="text-[#8E8E93]" />
          <span>Launch Interactive Guide</span>
        </button>
      </section>

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] text-xs">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2.5">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#0A84FF] text-white text-xs font-semibold hover:opacity-88 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
        >
          <Save size={15} />
          <span>{saving ? "Saving…" : saved ? "✓ Saved" : "Save Preferences"}</span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.09] text-[#8E8E93] text-xs hover:text-white hover:bg-white/[0.05] transition-colors"
        >
          <LogOut size={15} />
          <span>Log Out</span>
        </button>

        <button
          onClick={() => setDeleteOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#FF453A]/25 text-[#FF453A] text-xs hover:bg-[#FF453A]/10 transition-colors"
        >
          <Trash2 size={15} />
          <span>Delete Account</span>
        </button>
      </div>

      {/* ── App Version Footer with subtle Bubu ── */}
      <div className="pt-10 pb-2 flex items-center justify-center gap-2 text-[11px] text-[#8E8E93]/40 select-none">
        <span>LearnFlow AI &bull; v2.0</span>
        <button
          onClick={() => {
            const count = (Number(sessionStorage.getItem("bubu_settings_clicks") || "0") + 1);
            if (count >= 4) {
              sessionStorage.setItem("bubu_settings_clicks", "0");
              window.dispatchEvent(new CustomEvent("trigger-bubu-message"));
            } else {
              sessionStorage.setItem("bubu_settings_clicks", String(count));
              setTimeout(() => sessionStorage.setItem("bubu_settings_clicks", "0"), 2000);
            }
          }}
          className="opacity-40 hover:opacity-80 active:scale-90 transition-all cursor-pointer text-xs select-none"
          title=""
          aria-label="Bubu"
        >
          🐼
        </button>
      </div>

      {/* Delete confirmation Modal */}
      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Permanently Delete Account?"
      >
        <p className="text-xs text-[#8E8E93] mb-6">
          This will permanently delete your account, courses, syllabus, and all notes. There is no undo.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setDeleteOpen(false)}
            className="flex-1 py-2.5 rounded-xl border border-white/[0.09] text-[#8E8E93] text-xs font-semibold hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-[#FF453A] text-white text-xs font-semibold hover:opacity-88 disabled:opacity-40"
          >
            {deleting ? "Deleting…" : "Yes, Delete Everything"}
          </button>
        </div>
      </Modal>
    </motion.div>
  );
}
