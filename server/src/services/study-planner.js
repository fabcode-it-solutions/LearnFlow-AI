import mongoose from "mongoose";
import { estimateTopicMinutes } from "../utils/syllabus-parser.js";

/**
 * LearnFlow AI — Pedagogical Brain & Scheduling Engine
 * ──────────────────────────────────────────────────
 * Generates a day-by-day, step-by-step study roadmap using cognitive load theory,
 * multi-subject interleaving, and prerequisite progression.
 *
 * Pedagogical Architecture:
 * 1. Multi-Subject Interleaving:
 *    Instead of studying one single subject sequentially for weeks (which causes
 *    cognitive fatigue and leaves other subjects neglected), the engine schedules
 *    at least 2 subjects per day (when >= 2 subjects exist) so subjects progress in parallel.
 * 2. Prerequisite Sequence (Unit Progression):
 *    For each subject, topics strictly progress from Unit 1 (Foundations) → Unit 2 → Unit 3 → Unit 4.
 * 3. Cognitive Phase within Units:
 *    - Phase 1 (Foundations & Primers): Intro, Architecture, Models, Basics
 *    - Phase 2 (Core Concepts & Mechanics): Core algorithms, tables, queries
 *    - Phase 3 (Advanced Synthesis & Recovery): Optimization, Concurrency, Distributed systems
 * 4. Deliberate Practice & Hands-on Lab Block:
 *    Daily study time is split:
 *    - Core Subjects (e.g. 2 hours in a 3-hour plan, divided across 2 subjects)
 *    - Dedicated Lab / Practice Block (e.g. 1 hour in a 3-hour plan) dedicated to hands-on
 *      coding practice/problem solving for tech courses, or active recall mock quizzes for theory.
 * 5. Transparent Reasoning:
 *    Every plan entry includes `whyLogic` explaining why to study it now.
 */

export function classifyTopic(title) {
  const lower = (title || "").toLowerCase();
  // Phase 1: Foundation / Primer
  if (
    lower.includes("introduction") ||
    lower.includes("overview") ||
    lower.includes("basics") ||
    lower.includes("fundamentals") ||
    lower.includes("concept") ||
    lower.includes("architecture") ||
    lower.includes("model") ||
    lower.includes("structure") ||
    lower.includes("representation") ||
    lower.includes("adt")
  ) {
    return { phase: 1, label: "Foundations" };
  }

  // Phase 3: Advanced / Synthesis
  if (
    lower.includes("optimization") ||
    lower.includes("recovery") ||
    lower.includes("deadlock") ||
    lower.includes("concurrency") ||
    lower.includes("distributed") ||
    lower.includes("advanced") ||
    lower.includes("decomposition") ||
    lower.includes("synthesis") ||
    lower.includes("security") ||
    lower.includes("protocol")
  ) {
    return { phase: 3, label: "Advanced Mastery" };
  }

  // Phase 2: Core Concepts
  return { phase: 2, label: "Core Concept" };
}

export function isTechSubjectOrTopic(text) {
  if (!text || typeof text !== "string") return false;
  return /\b(code|coding|programming|developer|software|python|java|c\+\+|c\b|c#|dsa|data structure|algorithm|web|react|javascript|js|node|html|css|sql|dbms|database|query|queries|compiler|os|operating system|linux|unix|network|tcp|cloud|aws|docker|devops|machine learning|ai|deep learning|git|oops|backend|frontend|api|rest|express|mongodb|pointer|tree|graph|array|stack|queue|sort|search|recursion|cyber|security|automata|computation)\b/i.test(text);
}

export function generateWhyLogic(title, unitNumber, unitTitle, phase, confidence) {
  const cleanUnit = unitTitle || `Unit ${unitNumber}`;

  if (phase === 1) {
    return `Foundational anchor for ${cleanUnit} — builds baseline understanding required before advancing to core mechanics.`;
  }
  if (confidence <= 2) {
    return `High-yield focus area: User rated weak confidence (${confidence}/5) — allocated early within ${cleanUnit} for deliberate practice.`;
  }
  if (phase === 3) {
    return `Advanced module synthesis — applies foundational principles from earlier units to tackle complex exam numericals & system design.`;
  }
  return `Core curriculum milestone — advances ${cleanUnit} mastery and prepares for unit checkpoint review.`;
}

/**
 * Calculates daily time budget partitioning
 * E.g. for 3 hours: 120 mins core subjects (60 min x 2 subjects) + 60 mins coding lab / practice
 */
export function getDailyTimeBudget(dailyHours) {
  const totalMinutes = Math.max(Math.round(dailyHours * 60), 30);
  let practiceMinutes = 15;

  if (totalMinutes >= 180) {
    practiceMinutes = 60; // 1 full hour dedicated to coding lab / active recall
  } else if (totalMinutes >= 120) {
    practiceMinutes = 30; // 30 mins dedicated to practice
  } else if (totalMinutes >= 60) {
    practiceMinutes = 15;
  } else {
    practiceMinutes = 10;
  }

  const coreMinutes = Math.max(totalMinutes - practiceMinutes, 20);
  return { totalMinutes, coreMinutes, practiceMinutes };
}

/**
 * Generates an interleaved, pedagogical multi-subject study plan.
 *
 * @param {Array} subjects  — populated Subject documents (with .topics[])
 * @param {Date}  startDate — first day of the plan (usually today)
 * @param {number} dailyHours — hours available per day
 * @returns {Array} planEntries — sorted array of PlanEntry objects
 */
export function generateStudyPlan(subjects, startDate, dailyHours) {
  const { coreMinutes, practiceMinutes } = getDailyTimeBudget(dailyHours);

  // ── 1. Build an internal topic queue for each subject with pending topics ────
  // Each subject queue enforces strict Unit 1 → Unit 2 prerequisite progression
  // and sorts topics within each unit: Foundations → Core → Advanced, weak confidence first.
  const subjectQueues = new Map();
  const now = new Date(startDate);

  for (const subject of subjects) {
    const examDate = new Date(subject.examDate);
    const daysUntilExam = Math.max(
      Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)),
      1
    );
    const urgency = 1 / daysUntilExam;

    const pendingTopics = subject.topics.filter((t) => !t.completed);
    if (pendingTopics.length === 0) continue;

    const totalSubjectMinutes = pendingTopics.reduce((sum, t) => {
      const mins =
        t.estimatedMinutes && t.estimatedMinutes >= 5
          ? t.estimatedMinutes
          : estimateTopicMinutes(t.title);
      return sum + mins;
    }, 0);

    // Group pending topics by Unit Number
    const unitMap = new Map();
    for (const t of pendingTopics) {
      const uNum = t.unitNumber || 1;
      if (!unitMap.has(uNum)) unitMap.set(uNum, []);
      unitMap.get(uNum).push(t);
    }

    const sortedUnitNums = Array.from(unitMap.keys()).sort((a, b) => a - b);
    const queue = [];

    for (const uNum of sortedUnitNums) {
      const unitTopics = unitMap.get(uNum);

      // Within this unit, sort by:
      // 1. Cognitive Phase (1: Foundations → 2: Core → 3: Advanced)
      // 2. Confidence Score (1, 2 first so weaker topics are practiced early)
      unitTopics.sort((a, b) => {
        const classA = classifyTopic(a.title);
        const classB = classifyTopic(b.title);
        if (classA.phase !== classB.phase) {
          return classA.phase - classB.phase;
        }
        return (a.confidenceScore || 3) - (b.confidenceScore || 3);
      });

      for (const topic of unitTopics) {
        const estMins =
          topic.estimatedMinutes && topic.estimatedMinutes >= 5
            ? topic.estimatedMinutes
            : estimateTopicMinutes(topic.title);
        queue.push({
          topic,
          unitNumber: uNum,
          unitTitle: topic.unitTitle || `Unit ${uNum}`,
          estimatedMinutes: estMins,
          remainingMinutes: estMins,
          confidence: topic.confidenceScore || 3,
        });
      }
    }

    subjectQueues.set(subject._id.toString(), {
      subject,
      urgency,
      daysUntilExam,
      totalSubjectMinutes,
      queue,
      lastScheduledDayIndex: -999,
    });
  }

  // ── 2. Day-by-Day Interleaving Scheduler ─────────────────────────────────────
  const planEntries = [];
  let currentDay = new Date(startDate);
  currentDay.setHours(0, 0, 0, 0);
  let dayIndex = 0;
  let orderIndex = 1;
  const maxDaysSafety = 365;

  while (dayIndex < maxDaysSafety) {
    const activeSubjectKeys = Array.from(subjectQueues.keys()).filter((k) => {
      return subjectQueues.get(k).queue.length > 0;
    });

    if (activeSubjectKeys.length === 0) break; // All topics across all subjects scheduled!

    // Determine how many subjects to schedule today
    // Focus on at least 2 subjects per day when >= 2 subjects have pending topics
    const targetSubjectsCount = Math.min(2, activeSubjectKeys.length);

    // Score active subjects: combine Exam Urgency with Starvation Prevention
    const scoredSubjects = activeSubjectKeys.map((key) => {
      const sObj = subjectQueues.get(key);
      const daysSinceLast = dayIndex - sObj.lastScheduledDayIndex;
      const starvationBonus = Math.min(daysSinceLast, 10) * 1.5;
      const score = sObj.urgency * 10 + starvationBonus;
      return { key, sObj, score };
    });

    scoredSubjects.sort((a, b) => b.score - a.score);
    const selectedForToday = scoredSubjects.slice(0, targetSubjectsCount);

    const baseMinutesPerSubject = Math.floor(coreMinutes / targetSubjectsCount);
    let remainingDayCoreMinutes = coreMinutes;
    const todayEntries = [];
    const subjectsStudiedToday = [];

    // Distribute core minutes across the chosen subjects
    for (let i = 0; i < selectedForToday.length; i++) {
      const { sObj } = selectedForToday[i];
      let allocatedMinutesForThisSubject =
        i === selectedForToday.length - 1
          ? remainingDayCoreMinutes
          : baseMinutesPerSubject;

      let minutesTaken = 0;
      while (sObj.queue.length > 0 && allocatedMinutesForThisSubject > 0) {
        const topTopic = sObj.queue[0];
        const needed = topTopic.remainingMinutes;
        const take = Math.min(needed, allocatedMinutesForThisSubject);

        const topicWeight =
          sObj.totalSubjectMinutes > 0
            ? (topTopic.estimatedMinutes || 15) / sObj.totalSubjectMinutes
            : 1;
        const priorityScore = sObj.urgency * (6 - topTopic.confidence) * topicWeight;
        const { phase } = classifyTopic(topTopic.topic.title);
        const why = generateWhyLogic(
          topTopic.topic.title,
          topTopic.unitNumber,
          topTopic.unitTitle,
          phase,
          topTopic.confidence
        );

        todayEntries.push({
          date: new Date(currentDay),
          subjectId: sObj.subject._id,
          subjectName: sObj.subject.name,
          subjectColor: sObj.subject.colorTag || "#0A84FF",
          topicId: topTopic.topic._id,
          topicTitle: topTopic.topic.title,
          unitNumber: topTopic.unitNumber,
          unitTitle: topTopic.unitTitle,
          estimatedMinutes: take,
          status: "pending",
          entryType: "theory",
          priorityScore: parseFloat(priorityScore.toFixed(4)),
          whyLogic: why,
          orderIndex: orderIndex++,
          xpReward: topTopic.confidence <= 2 ? 75 : 50,
        });

        topTopic.remainingMinutes -= take;
        allocatedMinutesForThisSubject -= take;
        remainingDayCoreMinutes -= take;
        minutesTaken += take;

        if (topTopic.remainingMinutes <= 0) {
          sObj.queue.shift();
        }
      }

      if (minutesTaken > 0) {
        sObj.lastScheduledDayIndex = dayIndex;
        if (!subjectsStudiedToday.some((s) => s._id.toString() === sObj.subject._id.toString())) {
          subjectsStudiedToday.push(sObj.subject);
        }
      }
    }

    // If leftover core minutes exist because a subject's queue finished, distribute to other active subjects
    if (remainingDayCoreMinutes > 0) {
      const otherActive = activeSubjectKeys
        .filter((k) => subjectQueues.get(k).queue.length > 0)
        .map((k) => subjectQueues.get(k));

      for (const sObj of otherActive) {
        if (remainingDayCoreMinutes <= 0) break;
        while (sObj.queue.length > 0 && remainingDayCoreMinutes > 0) {
          const topTopic = sObj.queue[0];
          const take = Math.min(topTopic.remainingMinutes, remainingDayCoreMinutes);

          const topicWeight =
            sObj.totalSubjectMinutes > 0
              ? (topTopic.estimatedMinutes || 15) / sObj.totalSubjectMinutes
              : 1;
          const priorityScore = sObj.urgency * (6 - topTopic.confidence) * topicWeight;
          const { phase } = classifyTopic(topTopic.topic.title);
          const why = generateWhyLogic(
            topTopic.topic.title,
            topTopic.unitNumber,
            topTopic.unitTitle,
            phase,
            topTopic.confidence
          );

          todayEntries.push({
            date: new Date(currentDay),
            subjectId: sObj.subject._id,
            subjectName: sObj.subject.name,
            subjectColor: sObj.subject.colorTag || "#0A84FF",
            topicId: topTopic.topic._id,
            topicTitle: topTopic.topic.title,
            unitNumber: topTopic.unitNumber,
            unitTitle: topTopic.unitTitle,
            estimatedMinutes: take,
            status: "pending",
            entryType: "theory",
            priorityScore: parseFloat(priorityScore.toFixed(4)),
            whyLogic: why,
            orderIndex: orderIndex++,
            xpReward: topTopic.confidence <= 2 ? 75 : 50,
          });

          topTopic.remainingMinutes -= take;
          remainingDayCoreMinutes -= take;

          if (topTopic.remainingMinutes <= 0) {
            sObj.queue.shift();
          }
          if (!subjectsStudiedToday.some((s) => s._id.toString() === sObj.subject._id.toString())) {
            subjectsStudiedToday.push(sObj.subject);
            sObj.lastScheduledDayIndex = dayIndex;
          }
        }
      }
    }

    // ── 3. Dedicated Daily Practice Block: Code Lab or Active Recall Quiz ─────
    if (todayEntries.length > 0 && practiceMinutes > 0) {
      const isTech = subjectsStudiedToday.some(
        (s) =>
          isTechSubjectOrTopic(s.name) ||
          s.topics?.some((t) => isTechSubjectOrTopic(t.title))
      );

      const primarySubject = subjectsStudiedToday[0] || subjects[0];
      const subjectNamesStr = subjectsStudiedToday.map((s) => s.name).join(" & ");

      if (isTech) {
        todayEntries.push({
          date: new Date(currentDay),
          subjectId: primarySubject._id,
          subjectName: primarySubject.name,
          subjectColor: primarySubject.colorTag || "#0A84FF",
          topicId: new mongoose.Types.ObjectId(),
          topicTitle: `💻 Code Lab: ${subjectNamesStr} Practice & Problem Solving`,
          unitNumber: 0,
          unitTitle: "Deliberate Practice & Lab",
          estimatedMinutes: practiceMinutes,
          status: "pending",
          entryType: "coding_lab",
          priorityScore: 9.99,
          whyLogic: `Daily Deliberate Practice: Hands-on coding and query implementation for ${subjectNamesStr} to translate concepts into programming muscle memory.`,
          orderIndex: orderIndex++,
          xpReward: 100,
        });
      } else {
        todayEntries.push({
          date: new Date(currentDay),
          subjectId: primarySubject._id,
          subjectName: primarySubject.name,
          subjectColor: primarySubject.colorTag || "#0A84FF",
          topicId: new mongoose.Types.ObjectId(),
          topicTitle: `📝 Daily Mock Quiz & Active Recall Review`,
          unitNumber: 0,
          unitTitle: "Active Recall & Quiz",
          estimatedMinutes: practiceMinutes,
          status: "pending",
          entryType: "mock_quiz",
          priorityScore: 9.99,
          whyLogic: `Spaced Retrieval Practice: End-of-day self-quizzing and active recall on ${subjectNamesStr} to cement long-term neural retention.`,
          orderIndex: orderIndex++,
          xpReward: 100,
        });
      }
    }

    planEntries.push(...todayEntries);

    // Advance to next day
    currentDay = new Date(currentDay);
    currentDay.setDate(currentDay.getDate() + 1);
    dayIndex++;
  }

  return planEntries;
}

/**
 * Reschedule missed entries starting from tomorrow so Today's agenda is not duplicated.
 */
export function rescheduleMissedEntries(existingEntries, missedEntryIds, today, dailyHours) {
  const dailyMinutes = dailyHours * 60;
  const missedSet = new Set(missedEntryIds.map(String));

  const updatedExisting = existingEntries.map((e) => {
    if (missedSet.has(String(e._id))) {
      const obj = typeof e.toObject === "function" ? e.toObject() : { ...e };
      obj.status = "missed";
      return obj;
    }
    return e;
  });

  const missedTasks = existingEntries.filter((e) => missedSet.has(String(e._id)));
  if (missedTasks.length === 0) return updatedExisting;

  let currentDay = new Date(today);
  currentDay.setHours(0, 0, 0, 0);
  currentDay.setDate(currentDay.getDate() + 1);

  const existingTomorrowMinutes = existingEntries
    .filter((e) => {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === currentDay.getTime() && e.status === "pending";
    })
    .reduce((sum, e) => sum + (e.estimatedMinutes || 15), 0);

  let minutesUsedToday = existingTomorrowMinutes;
  const rescheduledEntries = [];

  for (const task of missedTasks) {
    let remaining = task.estimatedMinutes || 15;

    while (remaining > 0) {
      const availableToday = dailyMinutes - minutesUsedToday;

      if (availableToday <= 0) {
        currentDay = new Date(currentDay);
        currentDay.setDate(currentDay.getDate() + 1);
        minutesUsedToday = 0;
        continue;
      }

      const chunk = Math.min(remaining, availableToday);

      rescheduledEntries.push({
        date: new Date(currentDay),
        subjectId: task.subjectId,
        subjectName: task.subjectName,
        subjectColor: task.subjectColor,
        topicId: task.topicId,
        topicTitle: task.topicTitle,
        unitNumber: task.unitNumber || 1,
        unitTitle: task.unitTitle || "",
        estimatedMinutes: chunk,
        status: "pending",
        entryType: task.entryType || "theory",
        priorityScore: (task.priorityScore || 1) * 1.2, // bump priority for missed tasks
        whyLogic: task.whyLogic || "Rescheduled from earlier missed session.",
        orderIndex: task.orderIndex || 1,
        xpReward: task.xpReward || 50,
      });

      minutesUsedToday += chunk;
      remaining -= chunk;
    }
  }

  return [...updatedExisting, ...rescheduledEntries];
}

/**
 * Generate human-readable AI schedule insights and decision explanations.
 * Returns an array of formatted insight strings matching the InsightsPage UI.
 *
 * @param {Array} subjects — populated Subject documents (with .topics[])
 * @param {number|Array} dailyHoursOrPlanEntries — hours available per day or plan entries
 * @returns {string[]} array of human-readable insight lines
 */
export function generateInsights(subjects = [], dailyHoursOrPlanEntries = 2) {
  const dailyHours =
    typeof dailyHoursOrPlanEntries === "number"
      ? dailyHoursOrPlanEntries
      : 2;

  const insights = [];
  const today = new Date();

  for (const subject of subjects) {
    const examDate = new Date(subject.examDate);
    const daysLeft = Math.max(
      Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
      0
    );

    const pending = (subject.topics || []).filter((t) => !t.completed);
    if (pending.length === 0) continue;

    const avgConfidence =
      pending.reduce((s, t) => s + (t.confidenceScore || 3), 0) / pending.length;
    const totalMinutes = pending.reduce((s, t) => s + (t.estimatedMinutes || 15), 0);
    const daysNeeded = Math.max(Math.ceil(totalMinutes / (dailyHours * 60)), 1);

    const urgencyLabel =
      daysLeft <= 3 ? "🔴 Critical" : daysLeft <= 7 ? "🟡 Urgent" : "🟢 On track";

    insights.push(
      `${urgencyLabel} — ${subject.name}: exam in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}, ` +
        `avg confidence ${avgConfidence.toFixed(1)}/5, ` +
        `${pending.length} topic${pending.length !== 1 ? "s" : ""} remaining (~${daysNeeded} study day${daysNeeded !== 1 ? "s" : ""} needed).`
    );

    // Highlight the weakest topic
    const weakest = [...pending].sort((a, b) => (a.confidenceScore || 3) - (b.confidenceScore || 3))[0];
    if (weakest && (weakest.confidenceScore || 3) <= 2) {
      insights.push(
        `  ↳ Focus first on "${weakest.title}" — confidence ${weakest.confidenceScore}/5 means it's your biggest risk for ${subject.name}.`
      );
    }
  }

  // Multi-subject pacing insight
  if (subjects.length > 1) {
    insights.push(
      `⚖️ Multi-Subject Routine: Your ${dailyHours}h daily budget interleaves multiple subjects per day to keep all syllabus tracks moving in parallel without single-subject burnout.`
    );
  }

  if (insights.length === 0) {
    insights.push("✅ All topics completed — you are fully on track across all enrolled subjects!");
  }

  return insights;
}
