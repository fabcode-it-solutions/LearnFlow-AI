import { Subject } from "../models/subject.model.js";
import { StudyPlan } from "../models/studyPlan.model.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

// ── GET /api/dashboard/summary ────────────────────────────────────────────────
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ userId: req.user._id });
  const plan = await StudyPlan.findOne({ userId: req.user._id });

  // ── Overall topic completion ───────────────────────────────────────────────
  const totalTopics = subjects.reduce((s, sub) => s + sub.topics.length, 0);
  const completedTopics = subjects.reduce(
    (s, sub) => s + sub.topics.filter((t) => t.completed).length,
    0
  );
  const completionPct =
    totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  // ── Today's tasks ─────────────────────────────────────────────────────────
  let todayTotal = 0;
  let todayDone = 0;
  if (plan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEntries = plan.planEntries.filter((e) => {
      const d = new Date(e.date);
      return d >= today && d < tomorrow;
    });
    // Deduplicate today's tasks by unique topic to prevent duplicate counts from rescheduled items
    const uniqueMap = new Map();
    todayEntries.forEach((e) => {
      const k = e.topicId ? e.topicId.toString() : e.topicTitle;
      if (!uniqueMap.has(k) || e.status === "done") {
        uniqueMap.set(k, e);
      }
    });
    const uniqueList = Array.from(uniqueMap.values());
    todayTotal = uniqueList.length;
    todayDone = uniqueList.filter((e) => e.status === "done").length;
  }

  // ── Streak calculation ─────────────────────────────────────────────────────
  // A streak day = at least one "done" entry on that day
  let streak = 0;
  if (plan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDay = new Date(today);
    while (true) {
      const dayStart = new Date(checkDay);
      const dayEnd = new Date(checkDay);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayEntries = plan.planEntries.filter((e) => {
        const d = new Date(e.date);
        return d >= dayStart && d < dayEnd;
      });

      // If the day had entries, check if any were done
      if (dayEntries.length > 0) {
        const anyDone = dayEntries.some((e) => e.status === "done");
        if (anyDone) {
          streak++;
        } else {
          // For today, don't break streak if still pending
          if (checkDay.getTime() !== today.getTime()) break;
        }
      } else if (checkDay.getTime() !== today.getTime()) {
        break;
      }

      checkDay.setDate(checkDay.getDate() - 1);
      if (streak > 365) break; // safety cap
    }
  }

  // ── Subject-wise time distribution ────────────────────────────────────────
  const subjectStats = subjects.map((sub) => {
    const pending = sub.topics.filter((t) => !t.completed);
    const done = sub.topics.filter((t) => t.completed);
    const daysUntilExam = Math.max(
      Math.ceil((new Date(sub.examDate) - new Date()) / (1000 * 60 * 60 * 24)),
      0
    );
    return {
      subjectId: sub._id,
      name: sub.name,
      color: sub.colorTag,
      totalTopics: sub.topics.length,
      completedTopics: done.length,
      pendingMinutes: pending.reduce((s, t) => s + t.estimatedMinutes, 0),
      daysUntilExam,
    };
  });

  // ── 14-day completion history (for AreaChart) ─────────────────────────────
  const history = [];
  if (plan) {
    for (let i = 13; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      day.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayEntries = plan.planEntries.filter((e) => {
        const d = new Date(e.date);
        return d >= day && d < dayEnd;
      });

      const dayDone = dayEntries.filter((e) => e.status === "done").length;
      const dayTotal = dayEntries.length;

      history.push({
        date: day.toISOString().split("T")[0],
        done: dayDone,
        total: dayTotal,
        pct: dayTotal > 0 ? Math.round((dayDone / dayTotal) * 100) : null,
      });
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        completionPct,
        totalTopics,
        completedTopics,
        todayTotal,
        todayDone,
        streak,
        subjectStats,
        history,
      },
      "Dashboard summary fetched"
    )
  );
});

