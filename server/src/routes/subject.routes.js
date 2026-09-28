import { Router } from "express";
import { body } from "express-validator";
import {
  getSubjects,
  createSubject,
  batchCreateSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
  addTopic,
  batchAddTopics,
  parseSyllabus,
  updateTopic,
  deleteTopic,
  clearAllTopics,
  addResource,
  deleteResource,
  addNote,
  updateNote,
  deleteNote,
  getAllNotes,
} from "../controllers/subject.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = Router();

// All subject routes require auth
router.use(verifyJWT);

// Centralized notes endpoint (must be before /:id)
router.get("/notes/all", getAllNotes);

// Parse syllabus text endpoint
router.post(
  "/parse-syllabus",
  [body("text").trim().notEmpty().withMessage("Syllabus text is required")],
  validate,
  parseSyllabus
);

// Batch create subjects for an entire semester
router.post(
  "/batch",
  [
    body("subjects").isArray({ min: 1 }).withMessage("Subjects array is required"),
    body("semesterOrTrack").trim().notEmpty().withMessage("Semester or track name is required"),
  ],
  validate,
  batchCreateSubjects
);

router.get("/", getSubjects);

router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Subject name is required"),
    body("examDate").isISO8601().withMessage("Valid exam/target date is required"),
  ],
  validate,
  createSubject
);

router.get("/:id", getSubjectById);

router.put(
  "/:id",
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("examDate").optional().isISO8601().withMessage("Valid exam date required"),
  ],
  validate,
  updateSubject
);

router.delete("/:id", deleteSubject);

// Topic sub-routes
router.post(
  "/:id/topics",
  [
    body("title").trim().notEmpty().withMessage("Topic title is required"),
    body("confidenceScore")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Confidence score must be 1–5"),
    body("estimatedMinutes")
      .optional()
      .isInt({ min: 5 })
      .withMessage("Estimated minutes must be at least 5"),
  ],
  validate,
  addTopic
);

// Batch add topics to curriculum (from parsed syllabus or multi-paste)
router.post(
  "/:id/topics/batch",
  [
    body("topics").isArray({ min: 1 }).withMessage("Topics array is required"),
  ],
  validate,
  batchAddTopics
);

router.put(
  "/:id/topics/:topicId",
  [
    body("confidenceScore")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Confidence score must be 1–5"),
    body("estimatedMinutes")
      .optional()
      .isInt({ min: 5 })
      .withMessage("Estimated minutes must be at least 5"),
  ],
  validate,
  updateTopic
);

router.delete("/:id/topics/:topicId", deleteTopic);
router.delete("/:id/topics", clearAllTopics);

// Resource Vault sub-routes (Google Drive links, YouTube playlists, Books, PDFs)
router.post(
  "/:id/resources",
  [
    body("title").trim().notEmpty().withMessage("Resource title is required"),
    body("url").trim().notEmpty().withMessage("Valid resource URL is required"),
  ],
  validate,
  addResource
);

router.delete("/:id/resources/:resourceId", deleteResource);

// Cloud Notes sub-routes (Markdown notes stored per user)
router.post(
  "/:id/notes",
  [body("title").trim().notEmpty().withMessage("Note title is required")],
  validate,
  addNote
);

router.put("/:id/notes/:noteId", updateNote);

router.delete("/:id/notes/:noteId", deleteNote);

export default router;
