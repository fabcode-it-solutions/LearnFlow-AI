import { useEffect, useState } from "react";
import { Lightbulb, Brain, Cpu, CheckCircle } from "lucide-react";
import api from "../lib/api";
import EmptyState from "../components/EmptyState";

export default function InsightsPage() {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/plan/insights")
      .then((res) => {
        const raw = res.data?.data?.insights;
        if (Array.isArray(raw)) {
          setInsights(raw);
        } else if (raw && Array.isArray(raw.lines)) {
          setInsights(raw.lines);
        } else {
          setInsights([]);
        }
      })
      .catch(() => setInsights([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-10 w-full animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-48 mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 w-full pb-24 md:pb-12 text-white">
      {/* Top Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Brain size={16} className="text-amber-400" />
          <span className="text-xs font-mono text-amber-400 uppercase tracking-wider">
            Decision Explanations
          </span>
        </div>
        <h1 className=" text-3xl font-semibold">
          AI Schedule Insights
        </h1>
        <p className=" text-xs text-ink-60 mt-0.5">
          Transparent, deterministic logic explaining why each topic is prioritized on your calendar.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Insight Cards (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          {insights.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              message="No insights generated yet"
              subMessage="Add subjects with syllabus topics and confidence ratings to generate your personalized AI prioritization breakdown."
            />
          ) : (
            insights.map((insight, i) => {
              const isChild = insight.startsWith("  ↳");
              const isRed = insight.includes("🔴");
              const isYellow = insight.includes("🟡");
              const isGreen = insight.includes("✅");

              return (
                <div
                  key={i}
                  className={`p-4 rounded-2xl border transition-all ${
                    isChild
                      ? "bg-white/[0.02] border-white/5 ml-6 text-ink-60 font-mono text-xs"
                      : isRed
                      ? "bg-rose-500/10 border-rose-500/25 text-rose-200 text-sm"
                      : isYellow
                      ? "bg-amber-500/10 border-amber-500/25 text-amber-200 text-sm"
                      : isGreen
                      ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-200 text-sm"
                      : "bg-[#141414] border-white/10 text-white text-sm"
                  }`}
                >
                  <p className="leading-relaxed">
                    {insight.replace("  ↳", "↳ ")}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Algorithm Breakdown Panel (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="bg-[#141414] border border-white/8 rounded-2xl p-6 shadow-xl sticky top-8 space-y-4">
            <div className="flex items-center gap-2 text-[#0A84FF]">
              <Cpu size={18} />
              <h3 className=" text-sm font-semibold text-white">
                How the Algorithm Works
              </h3>
            </div>

            <p className="text-xs text-ink-60 leading-relaxed">
              LearnFlow AI uses an offline, explainable priority scoring formula for each pending topic:
            </p>

            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-[#0A84FF] leading-loose">
              Priority = Urgency × (6 − Confidence) × TopicWeight
            </div>

            <ul className="text-xs text-ink-60 space-y-2 pt-2 border-t border-white/5">
              <li className="flex items-start gap-2">
                <span className="text-[#0A84FF] font-bold">1.</span>
                <span>
                  <strong className="text-white">Urgency:</strong> Inversely proportional to days remaining until your exam or target completion date. Closer exams receive exponentially higher weight.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0A84FF] font-bold">2.</span>
                <span>
                  <strong className="text-white">Confidence (1–5):</strong> Self-rated score. Rating 1 gives multiplier (6-1)=5, while rating 5 gives (6-5)=1. Weak areas are tackled first.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#0A84FF] font-bold">3.</span>
                <span>
                  <strong className="text-white">Rescheduling:</strong> If a session is missed, it automatically shifts forward into the earliest open time slot without displacing completed work.
                </span>
              </li>
            </ul>

            <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
              <CheckCircle size={13} />
              <span>100% Deterministic &amp; Zero API Latency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

