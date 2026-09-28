// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  dailyStudyHours: number;
  onboardingComplete: boolean;
  createdAt?: string;
}

// ── Resource Vault (Documents, Video Playlists, Books, PDFs) ─────────────
export type ResourceType = "drive" | "youtube" | "playlist" | "pdf" | "book" | "link";

export interface Resource {
  _id: string;
  title: string;
  type: ResourceType;
  url: string;
  createdAt?: string;
}

// ── Cloud Notes (Cloud-backed per user) ─────────────────────────────────────
export type NoteCategory = "study_notes" | "syllabus" | "codes" | "general";

export interface SubjectNote {
  _id: string;
  title: string;
  content: string;
  category?: NoteCategory;
  linkUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GlobalNote extends SubjectNote {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  semesterOrTrack?: string;
}

// ── Subject & Topic ───────────────────────────────────────────────────────────
export interface Topic {
  _id: string;
  title: string;
  unitNumber?: number;
  unitTitle?: string;
  confidenceScore: number; // 1–5
  estimatedMinutes: number;
  completed: boolean;
  notes?: string;
  resourceQuery?: string;
}

export interface Subject {
  _id: string;
  userId: string;
  name: string;
  degreeOrProgram?: string; // e.g. "MCA", "B.Tech", "Job Prep"
  semesterOrTrack?: string; // e.g. "MCA 1ST SEM", "Core Studies"
  category?: "exam" | "course" | "tech_stack" | "certification";
  examDate: string; // ISO date string
  colorTag: string;
  driveFolderUrl?: string; // Direct link to student's Google Drive folder
  rawSyllabusText?: string; // Stored raw syllabus document on website
  topics: Topic[];
  resources?: Resource[];
  notes?: SubjectNote[];
  daysUntilExam?: number; // virtual from backend
  createdAt?: string;
  updatedAt?: string;
}

export interface ParsedUnitTopic {
  title: string;
  unitNumber: number;
  unitTitle?: string;
  confidenceScore: number;
  estimatedMinutes: number;
  completed: boolean;
}

export interface ParsedUnit {
  unitNumber: number;
  unitTitle: string;
  topics: ParsedUnitTopic[];
}

// ── Study Plan ────────────────────────────────────────────────────────────────
export type EntryStatus = "pending" | "done" | "missed";

export interface PlanEntry {
  _id: string;
  date: string; // ISO date string
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  topicId: string;
  topicTitle: string;
  unitNumber?: number;
  unitTitle?: string;
  estimatedMinutes: number;
  status: EntryStatus;
  entryType?: "theory" | "coding_lab" | "mock_quiz";
  priorityScore?: number;
  whyLogic?: string;
  orderIndex?: number;
  xpReward?: number;
  resourceQuery?: string;
}

export interface StudyPlan {
  _id: string;
  userId: string;
  generatedAt: string;
  dailyHoursAvailable: number;
  planEntries: PlanEntry[];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface SubjectStat {
  subjectId: string;
  name: string;
  color: string;
  totalTopics: number;
  completedTopics: number;
  pendingMinutes: number;
  daysUntilExam: number;
  semesterOrTrack?: string;
}

export interface HistoryPoint {
  date: string;
  done: number;
  total: number;
  pct: number | null;
}

export interface DashboardSummary {
  completionPct: number;
  totalTopics: number;
  completedTopics: number;
  todayTotal: number;
  todayDone: number;
  streak: number;
  subjectStats: SubjectStat[];
  history: HistoryPoint[];
}

// ── API response wrapper ──────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}
