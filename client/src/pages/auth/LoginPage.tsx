import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { motion } from "framer-motion";
import { parseApiError, type ParsedApiError } from "../../lib/error-handler";
import Logo from "../../components/Logo";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Zap,
  Brain,
  BarChart2,
  FolderGit2,
  ArrowRight,
} from "lucide-react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

const features = [
  { icon: Zap, label: "Smart adaptive scheduling engine" },
  { icon: FolderGit2, label: "Resource vault: documents, videos & reading" },
  { icon: Brain, label: "Integrated study notes & syllabus tracking" },
  { icon: BarChart2, label: "Real-time mastery & streak tracker" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillEmail = searchParams.get("email") || "";

  const [errorDetails, setErrorDetails] = useState<ParsedApiError | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: prefillEmail },
  });

  const enteredEmail = watch("email");

  const onSubmit = async (data: FormData) => {
    setErrorDetails(null);
    try {
      await login(data.email, data.password);
      navigate("/");
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorDetails(parsed);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0A0A0A] text-white">
      {/* ── Left branding panel (hidden on mobile) ── */}
      <div className="hidden md:flex md:w-[45%] lg:w-[42%] bg-[#0F0F0F] border-r border-white/5 flex-col justify-between p-10 lg:p-14 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 hidden" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="mb-14">
            <Logo size={48} showTagline={true} textClassName="text-2xl" />
          </div>

          {/* Tagline */}
          <h2 className="text-3xl lg:text-4xl text-white font-semibold leading-snug mb-4">
            Plan smarter.
            <br />
            <span className="text-white">
              Study better.
            </span>
          </h2>
          <p className="text-xs text-slate-400 mb-10 max-w-sm">
            Intelligent study workspace designed for students, professionals, and self-directed learners. Organize courses, track curriculum, and achieve your learning goals.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-4">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#0A84FF] shrink-0">
                  <Icon size={16} />
                </div>
                <span className="text-xs text-slate-300">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
          <span>v2.0 Production</span>
          <span>Aashish Kumar</span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-[#0A0A0A] px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 md:hidden">
            <Logo size={42} showTagline={false} textClassName="text-2xl" />
          </div>

          {/* Form card */}
          <div className="bg-[#141414] rounded-2xl shadow-2xl border border-white/10 p-8">
            {/* Header */}
            <div className="mb-6 text-center">
              <h1 className="text-2xl text-white font-semibold">
                Welcome back
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Log in to resume your study queue and cloud notes.
              </p>
            </div>

            {/* User-friendly error banner */}
            {errorDetails && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex flex-col gap-2.5"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed">{errorDetails.message}</span>
                </div>

                {errorDetails.isNotRegistered && (
                  <div className="pt-2 border-t border-rose-500/20 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Not registered yet?</span>
                    <Link
                      to={`/signup?email=${encodeURIComponent(enteredEmail || "")}`}
                      className="text-[#0A84FF] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>Create account free</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              noValidate
            >
              {/* Email */}
              <div>
                <label
                  className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-1.5"
                  htmlFor="email"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 transition-colors"
                  placeholder="you@example.com"
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-400 font-body">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  className="block font-mono text-[11px] uppercase tracking-wider text-slate-300 mb-1.5"
                  htmlFor="password"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-white/20 transition-colors"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-400 font-body">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-[#0A84FF] text-white font-semibold text-xs hover:opacity-90 active:scale-95 transition-all  disabled:opacity-50 mt-2 cursor-pointer"
              >
                {isSubmitting ? "Logging in…" : "Log In"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[11px] font-mono text-slate-500 uppercase">
                or
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* Sign up link */}
            <p className="text-center text-xs text-slate-400">
              Don't have an account?{" "}
              <Link
                to="/signup"
                className="text-[#0A84FF] hover:underline font-semibold"
              >
                Sign up free
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
