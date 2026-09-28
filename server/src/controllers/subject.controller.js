import { Subject } from "../models/subject.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { parseSyllabusText } from "../utils/syllabus-parser.js";

// ── GET /api/subjects ─────────────────────────────────────────────────────────
export const getSubjects = asyncHandler(async (req, res) => {
  const { semesterOrTrack, category } = req.query;
  const filter = { userId: req.user._id };

  if (semesterOrTrack) filter.semesterOrTrack = semesterOrTrack;
  if (category) filter.category = category;

  const subjects = await Subject.find(filter).sort({ examDate: 1 });
  return res.status(200).json(new ApiResponse(200, { subjects }, "Subjects fetched"));
});

// ── POST /api/subjects ────────────────────────────────────────────────────────
export const createSubject = asyncHandler(async (req, res) => {
  const {
    name,
    examDate,
    colorTag,
    topics,
    semesterOrTrack,
    degreeOrProgram,
    driveFolderUrl,
    rawSyllabusText,
    category,
    resources,
  } = req.body;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);

  if (exam < today) {
    throw new ApiError(400, "Exam or target date cannot be in the past");
  }

  const subject = await Subject.create({
    userId: req.user._id,
    name,
    examDate,
    degreeOrProgram: degreeOrProgram || "General",
    semesterOrTrack: semesterOrTrack || "Core Curriculum",
    driveFolderUrl: driveFolderUrl || "",
    rawSyllabusText: rawSyllabusText || "",
    category: category || "exam",
    colorTag: colorTag || "#6366F1",
    topics: topics || [],
    resources: resources || [],
    notes: [],
  });

  return res.status(201).json(new ApiResponse(201, { subject }, "Subject created"));
});

// ── POST /api/subjects/batch (Create an entire semester of subjects at once) ──
export const batchCreateSubjects = asyncHandler(async (req, res) => {
  const { semesterOrTrack, degreeOrProgram, subjects, examDate } = req.body;

  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    throw new ApiError(400, "Subjects list is required");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
  exam.setHours(0, 0, 0, 0);

  const COLOR_PALETTE = [
    "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899",
    "#06B6D4", "#F43F5E", "#64748B", "#14B8A6", "#E11D48",
  ];

  const docsToCreate = subjects.map((item, idx) => {
    const name = typeof item === "string" ? item.trim() : item.name?.trim();
    const colorTag = typeof item === "object" && item.colorTag ? item.colorTag : COLOR_PALETTE[idx % COLOR_PALETTE.length];
    const driveFolderUrl = typeof item === "object" && item.driveFolderUrl ? item.driveFolderUrl : "";

    return {
      userId: req.user._id,
      name,
      degreeOrProgram: degreeOrProgram || "General",
      semesterOrTrack: semesterOrTrack || "Core Curriculum",
      driveFolderUrl,
      examDate: exam,
      colorTag,
      topics: [],
      resources: [],
      notes: [],
    };
  }).filter((s) => Boolean(s.name));

  if (docsToCreate.length === 0) {
    throw new ApiError(400, "At least one valid subject name is required");
  }

  const createdSubjects = await Subject.insertMany(docsToCreate);

  return res.status(201).json(
    new ApiResponse(201, { subjects: createdSubjects }, `${createdSubjects.length} subjects created`)
  );
});

// ── GET /api/subjects/:id ─────────────────────────────────────────────────────
export const getSubjectById = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!subject) throw new ApiError(404, "Subject not found");

  return res.status(200).json(new ApiResponse(200, { subject }, "Subject fetched"));
});

// ── PUT /api/subjects/:id ─────────────────────────────────────────────────────
export const updateSubject = asyncHandler(async (req, res) => {
  const {
    name,
    examDate,
    colorTag,
    semesterOrTrack,
    degreeOrProgram,
    driveFolderUrl,
    rawSyllabusText,
    category,
  } = req.body;

  if (examDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    exam.setHours(0, 0, 0, 0);

    if (exam < today) {
      throw new ApiError(400, "Exam or target date cannot be in the past");
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (examDate !== undefined) updates.examDate = examDate;
  if (colorTag !== undefined) updates.colorTag = colorTag;
  if (semesterOrTrack !== undefined) updates.semesterOrTrack = semesterOrTrack;
  if (degreeOrProgram !== undefined) updates.degreeOrProgram = degreeOrProgram;
  if (driveFolderUrl !== undefined) updates.driveFolderUrl = driveFolderUrl;
  if (rawSyllabusText !== undefined) updates.rawSyllabusText = rawSyllabusText;
  if (category !== undefined) updates.category = category;

  const subject = await Subject.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    updates,
    { new: true, runValidators: true }
  );

  if (!subject) throw new ApiError(404, "Subject not found");

  return res.status(200).json(new ApiResponse(200, { subject }, "Subject updated"));
});

// ── DELETE /api/subjects/:id ──────────────────────────────────────────────────
export const deleteSubject = asyncHandler(async (req, res) => {
  const subject = await Subject.findOneAndDelete({
    _id: req.params.id,
    userId: req.user._id,
  });

  if (!subject) throw new ApiError(404, "Subject not found");

  return res.status(200).json(new ApiResponse(200, {}, "Subject deleted"));
});

// ── POST /api/subjects/:id/topics ─────────────────────────────────────────────
export const addTopic = asyncHandler(async (req, res) => {
  const { title, confidenceScore, estimatedMinutes, unitNumber, notes, resourceQuery } = req.body;

  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  subject.topics.push({
    title,
    unitTitle: req.body.unitTitle || "",
    confidenceScore: confidenceScore ?? 3,
    estimatedMinutes: estimatedMinutes ?? 30,
    unitNumber: unitNumber ?? 1,
    notes: notes || "",
    resourceQuery: resourceQuery || `${subject.name} ${title} tutorial`,
  });

  await subject.save();

  return res.status(201).json(new ApiResponse(201, { subject }, "Topic added"));
});

// ── POST /api/subjects/:id/topics/batch ───────────────────────────────────────
export const batchAddTopics = asyncHandler(async (req, res) => {
  const { topics, rawSyllabusText, replaceExisting } = req.body;

  if (!topics || !Array.isArray(topics) || topics.length === 0) {
    throw new ApiError(400, "Topics array is required");
  }

  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  if (replaceExisting) {
    subject.topics = [];
  }

  let addedCount = 0;
  for (const t of topics) {
    const title = typeof t === "string" ? t.trim() : t.title?.trim();
    if (!title) continue;

    subject.topics.push({
      title,
      unitNumber: t.unitNumber ?? 1,
      unitTitle: t.unitTitle || "",
      confidenceScore: t.confidenceScore ?? 3,
      estimatedMinutes: t.estimatedMinutes ?? 30,
      completed: false,
      notes: t.notes || "",
      resourceQuery: t.resourceQuery || `${subject.name} ${title} tutorial`,
    });
    addedCount++;
  }

  if (rawSyllabusText !== undefined) {
    subject.rawSyllabusText = rawSyllabusText;
  }

  await subject.save();

  return res.status(201).json(
    new ApiResponse(201, { subject }, `${addedCount} topics added to curriculum`)
  );
});

// ── POST /api/subjects/parse-syllabus ─────────────────────────────────────────
export const parseSyllabus = asyncHandler(async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    throw new ApiError(400, "Syllabus text is required");
  }

  const result = parseSyllabusText(text);

  return res.status(200).json(
    new ApiResponse(
      200,
      result,
      `Parsed ${result.allTopics.length} topics across ${result.units.length} units`
    )
  );
});

// ── PUT /api/subjects/:id/topics/:topicId ─────────────────────────────────────
export const updateTopic = asyncHandler(async (req, res) => {
  const { title, confidenceScore, estimatedMinutes, completed, unitNumber, notes, resourceQuery } = req.body;

  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  const topic = subject.topics.id(req.params.topicId);
  if (!topic) throw new ApiError(404, "Topic not found");

  if (title !== undefined) topic.title = title;
  if (confidenceScore !== undefined) topic.confidenceScore = confidenceScore;
  if (estimatedMinutes !== undefined) topic.estimatedMinutes = estimatedMinutes;
  if (completed !== undefined) topic.completed = completed;
  if (unitNumber !== undefined) topic.unitNumber = unitNumber;
  if (notes !== undefined) topic.notes = notes;
  if (resourceQuery !== undefined) topic.resourceQuery = resourceQuery;

  await subject.save();

  return res.status(200).json(new ApiResponse(200, { subject }, "Topic updated"));
});

// ── DELETE /api/subjects/:id/topics/:topicId ──────────────────────────────────
export const deleteTopic = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  subject.topics.pull({ _id: req.params.topicId });
  await subject.save();

  return res.status(200).json(new ApiResponse(200, { subject }, "Topic deleted"));
});

// ── DELETE /api/subjects/:id/topics (Clear all topics) ────────────────────────
export const clearAllTopics = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  subject.topics = [];
  await subject.save();

  return res.status(200).json(new ApiResponse(200, { subject }, "All topics cleared"));
});

// ── POST /api/subjects/:id/resources ──────────────────────────────────────────
export const addResource = asyncHandler(async (req, res) => {
  const { title, type, url } = req.body;

  if (!title || !url) {
    throw new ApiError(400, "Title and URL are required");
  }

  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  subject.resources.push({
    title,
    type: type || "drive",
    url,
  });

  await subject.save();

  return res.status(201).json(new ApiResponse(201, { subject }, "Resource added"));
});

// ── DELETE /api/subjects/:id/resources/:resourceId ────────────────────────────
export const deleteResource = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  subject.resources.pull({ _id: req.params.resourceId });
  await subject.save();

  return res.status(200).json(new ApiResponse(200, { subject }, "Resource deleted"));
});

function detectNoteCategory(title = "", content = "") {
  const text = (title + " " + content).toLowerCase();
  if (
    /\b(code|coding|program|syntax|function|def |import |class |algorithm|script|sql|query|queries|schema|html|css|javascript|python|java|c\+\+|implement|implementation)\b/i.test(
      text
    )
  ) {
    return "codes";
  }
  if (
    /\b(syllabus|curriculum|module|course outline|units?|course structure|exam pattern|scheme)\b/i.test(
      text
    )
  ) {
    return "syllabus";
  }
  return "study_notes";
}

// ── POST /api/subjects/:id/notes ──────────────────────────────────────────────
export const addNote = asyncHandler(async (req, res) => {
  const { title, content, linkUrl, category } = req.body;

  if (!title) {
    throw new ApiError(400, "Note title is required");
  }

  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  const noteCategory =
    category && ["study_notes", "syllabus", "codes", "general"].includes(category)
      ? category
      : detectNoteCategory(title, content);

  subject.notes.push({
    title,
    content: content || "",
    category: noteCategory,
    linkUrl: linkUrl || "",
  });

  await subject.save();

  return res.status(201).json(new ApiResponse(201, { subject }, "Note added"));
});

// ── PUT /api/subjects/:id/notes/:noteId ───────────────────────────────────────
export const updateNote = asyncHandler(async (req, res) => {
  const { title, content, linkUrl, category } = req.body;

  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  const note = subject.notes.id(req.params.noteId);
  if (!note) throw new ApiError(404, "Note not found");

  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  if (linkUrl !== undefined) note.linkUrl = linkUrl;
  if (category !== undefined) {
    note.category = ["study_notes", "syllabus", "codes", "general"].includes(category)
      ? category
      : note.category;
  }

  await subject.save();

  return res.status(200).json(new ApiResponse(200, { subject }, "Note updated"));
});

// ── DELETE /api/subjects/:id/notes/:noteId ────────────────────────────────────
export const deleteNote = asyncHandler(async (req, res) => {
  const subject = await Subject.findOne({
    _id: req.params.id,
    userId: req.user._id,
  });
  if (!subject) throw new ApiError(404, "Subject not found");

  subject.notes.pull({ _id: req.params.noteId });
  await subject.save();

  return res.status(200).json(new ApiResponse(200, { subject }, "Note deleted"));
});

// ── GET /api/subjects/notes/all (Centralized Cloud Notes across all subjects) ──
export const getAllNotes = asyncHandler(async (req, res) => {
  const subjects = await Subject.find({ userId: req.user._id }).select("name colorTag semesterOrTrack notes");

  const allNotes = [];
  for (const s of subjects) {
    for (const n of s.notes) {
      allNotes.push({
        _id: n._id,
        subjectId: s._id,
        subjectName: s.name,
        subjectColor: s.colorTag,
        semesterOrTrack: s.semesterOrTrack,
        title: n.title,
        content: n.content,
        category: n.category || detectNoteCategory(n.title, n.content),
        linkUrl: n.linkUrl,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      });
    }
  }

  // Sort most recently updated first
  allNotes.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

  return res.status(200).json(new ApiResponse(200, { notes: allNotes }, "All notes fetched"));
});
