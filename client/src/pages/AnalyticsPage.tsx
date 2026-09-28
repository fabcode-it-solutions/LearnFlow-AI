import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { BarChart2, Flame, Target, Award } from "lucide-react";
import api from "../lib/api";
import EmptyState from "../components/EmptyState";
import type { DashboardSummary } from "../types";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-10 w-full animate-pulse">
        <div className="h-8 bg-white/5 rounded-xl w-48 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!summary || summary.totalTopics === 0) {
    return (
      <div className="p-6 md:p-10 w-full text-white">
        <h1 className=" text-3xl font-semibold mb-6">
          Progress &amp; Mastery Analytics
        </h1>
        <EmptyState
          icon={BarChart2}
          message="No study data recorded yet"
          subMessage="Mark tasks done in your daily schedule to populate learning charts and output metrics."
        />
      </div>
    );
  }

  // 14-day history for AreaChart
  const historyData = summary.history
    .filter((d) => d.total > 0)
    .map((d) => ({
      date: new Date(d.date).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      }),
      pct: d.pct ?? 0,
      done: d.done,
      total: d.total,
    }));

  // Pie chart: remaining study minutes by subject
  const pieData = summary.subjectStats
    .filter((s) => s.pendingMinutes > 0)
    .map((s) => ({
      name: s.name,
      value: Math.round(s.pendingMinutes / 60), // hours
      color: s.color,
    }));

  return (
    <div className="p-6 md:p-10 w-full pb-24 md:pb-12 text-white">
      {/* Top Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <BarChart2 size={16} className="text-ink-60" />
          <span className="text-xs font-mono text-ink-60 uppercase tracking-wider">
            Learning Output &amp; Metrics
          </span>
        </div>
        <h1 className=" text-3xl font-semibold">
          Progress Analytics
        </h1>
        <p className=" text-xs text-ink-60 mt-0.5">
          Track syllabus completion, study consistency, and subject workload balance.
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: Target,
            label: "Curriculum Mastery",
            value: `${summary.completionPct}%`,
            sub: `${summary.completedTopics} of ${summary.totalTopics} topics mastered`,
            color: "text-emerald-400",
          },
          {
            icon: Flame,
            label: "Current Streak",
            value: `${summary.streak} Days`,
            sub: "Consecutive study days logged",
            color: "text-amber-400",
          },
          {
            icon: Award,
            label: "Today's Score",
            value: `${summary.todayDone}/${summary.todayTotal}`,
            sub: "Tasks marked completed today",
            color: "text-white",
          },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div
            key={label}
            className="p-5 rounded-2xl bg-[#141414] border border-white/8 flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs text-ink-60 uppercase tracking-wider">
                {label}
              </span>
              <Icon size={16} className={color} />
            </div>
            <p className={`font-mono text-3xl font-bold ${color}`}>{value}</p>
            <p className=" text-xs text-ink-60 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Responsive Grid for Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 14-day completion area chart (8 Cols) */}
        <div className="lg:col-span-8 bg-[#141414] border border-white/8 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className=" text-lg font-semibold text-white">
                Daily Output (Last 14 Days)
              </h2>
              <p className="text-xs text-ink-60">Completion rate of planned study sessions.</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              14-Day Velocity
            </span>
          </div>

          {historyData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-ink-60">
              No historical data in the last 14 days. Complete scheduled tasks to see your velocity curve.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace", fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace", fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}%`, "Completion"]}
                    contentStyle={{
                      backgroundColor: "#11131F",
                      borderColor: "rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      color: "#FFFFFF",
                      fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', Inter, sans-serif",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="pct"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    fill="url(#areaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Subject workload pie chart (4 Cols) */}
        <div className="lg:col-span-4 bg-[#141414] border border-white/8 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className=" text-lg font-semibold text-white mb-1">
              Time by Course
            </h2>
            <p className="text-xs text-ink-60 mb-4">
              Estimated hours needed to master remaining syllabus topics.
            </p>

            {pieData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-ink-60">
                All topics completed!
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v) => [`${v ?? 0} hrs`, "Pending"]}
                      contentStyle={{
                        backgroundColor: "#11131F",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: 12,
                        color: "#FFFFFF",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Subject Legend List */}
          <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  <span className="text-ink-60 truncate">{d.name}</span>
                </div>
                <span className="font-mono text-white font-medium shrink-0">
                  {d.value}h left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

