import mongoose, { Schema } from "mongoose";

// ── Resource sub-document (Drive PDFs, YouTube Playlists, Books, Links) ───────
const resourceSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Resource title is required"],
      trim: true,
    },
    // Type of resource: "drive" (Google Drive), "youtube" (Video), "playlist" (YouTube Playlist), "pdf", "book", "link"
    type: {
      type: String,
      enum: ["drive", "youtube", "playlist", "pdf", "book", "link"],
      default: "drive",
    },
    url: {
      type: String,
      required: [true, "Resource URL or path is required"],
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

// ── Cloud Note sub-document (stored in database per user, NOT localStorage) ─────
const noteSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
    },
    content: {
      type: String,
      default: "",
    },
    // Category classification: study_notes (Study Notes), syllabus (Curriculum/Syllabus), codes (Code/Programs), general
    category: {
      type: String,
      enum: ["study_notes", "syllabus", "codes", "general"],
      default: "study_notes",
    },
    // Optional external reference (e.g. Google Drive PDF or Notion link)
    linkUrl: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true, timestamps: true }
);

// ── Topic sub-document ───────────────────────────────────────────────────────
const topicSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Topic title is required"],
      trim: true,
    },
    unitNumber: {
      type: Number,
      default: 1,
    },
    unitTitle: {
      type: String,
      default: "",
      trim: true,
    },
    // User's self-rated confidence: 1 (very low) → 5 (mastered)
    confidenceScore: {
      type: Number,
      required: true,
      min: [1, "Confidence must be between 1 and 5"],
      max: [5, "Confidence must be between 1 and 5"],
      default: 3,
    },
    // Estimated time to study this topic, in minutes
    estimatedMinutes: {
      type: Number,
      default: 30,
      min: 5,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    // Optional quick topic note / scratchpad
    notes: {
      type: String,
      default: "",
    },
    // Direct search query for auto-curated tutorial lookup
    resourceQuery: {
      type: String,
      default: "",
    },
  },
  { _id: true }
);

// ── Subject / Course Track document ──────────────────────────────────────────
const subjectSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Subject/Course name is required"],
      trim: true,
    },
    // Degree or Academic Program, e.g. "MCA", "B.Tech", "Job Prep"
    degreeOrProgram: {
      type: String,
      default: "General",
      trim: true,
    },
    // Grouping by Semester or Track, e.g. "MCA 1ST SEM", "Core Curriculum", "Certification"
    semesterOrTrack: {
      type: String,
      default: "Core Curriculum",
      trim: true,
    },
    category: {
      type: String,
      enum: ["exam", "course", "tech_stack", "certification"],
      default: "exam",
    },
    examDate: {
      type: Date,
      required: [true, "Exam or target completion date is required"],
    },
    // Direct link to the student's Google Drive folder for this subject
    driveFolderUrl: {
      type: String,
      default: "",
      trim: true,
    },
    // Full raw syllabus text stored right inside the subject
    rawSyllabusText: {
      type: String,
      default: "",
    },
    // Color used in charts and badges
    colorTag: {
      type: String,
      default: "#6366F1",
    },
    // Topics (Curriculum syllabus checklist)
    topics: [topicSchema],
    // Resource Vault: Drive folders, video playlists, PDFs, Books
    resources: [resourceSchema],
    // Cloud Notes: Markdown notes stored directly in database
    notes: [noteSchema],
  },
  { timestamps: true }
);

// ── Virtual: days until exam / target date ───────────────────────────────────
subjectSchema.virtual("daysUntilExam").get(function () {
  const now = new Date();
  const diff = this.examDate - now;
  return Math.max(Math.ceil(diff / (1000 * 60 * 60 * 24)), 0);
});

subjectSchema.set("toJSON", { virtuals: true });
subjectSchema.set("toObject", { virtuals: true });

export const Subject = mongoose.model("Subject", subjectSchema);
