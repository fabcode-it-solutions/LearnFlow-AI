import mongoose, { Schema } from "mongoose";

// ── Plan Entry sub-document ──────────────────────────────────────────────────
const planEntrySchema = new Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
    subjectName: {
      type: String, // denormalised for fast reads without populate
    },
    subjectColor: {
      type: String,
    },
    topicId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    topicTitle: {
      type: String, // denormalised
    },
    unitNumber: {
      type: Number,
      default: 1,
    },
    unitTitle: {
      type: String,
      default: "",
    },
    estimatedMinutes: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "done", "missed"],
      default: "pending",
    },
    entryType: {
      type: String,
      enum: ["theory", "coding_lab", "mock_quiz"],
      default: "theory",
    },
    // Priority score computed by the scoring engine (for AI Insights)
    priorityScore: {
      type: Number,
    },
    // Pedagogical reasoning: why study this topic now
    whyLogic: {
      type: String,
      default: "",
    },
    // Gamification properties for learning roadmap
    orderIndex: {
      type: Number,
      default: 1,
    },
    xpReward: {
      type: Number,
      default: 50,
    },
  },
  { _id: true }
);

// ── Study Plan document ──────────────────────────────────────────────────────
const studyPlanSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    dailyHoursAvailable: {
      type: Number,
      required: true,
    },
    planEntries: [planEntrySchema],
  },
  { timestamps: true }
);

export const StudyPlan = mongoose.model("StudyPlan", studyPlanSchema);

