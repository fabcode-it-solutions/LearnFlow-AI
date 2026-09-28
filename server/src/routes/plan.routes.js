import { Router } from "express";
import { body } from "express-validator";
import {
  generatePlan,
  getTodaysPlan,
  getWeekPlan,
  getFullPlan,
  updateEntry,
  deleteEntry,
  clearPlan,
  getInsights,
  pullNextEntryToToday,
} from "../controllers/plan.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validator.middleware.js";

const router = Router();

// ── Public Insights Engine Health Check ─────────────────────────────────────
router.get("/insights/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "AI Schedule Insights Engine",
    algorithm: "Priority Score = urgency × (6 − confidence) × topicWeight",
    version: "v2.0-multi-subject",
    multiSubjectPacing: true,
    timestamp: new Date().toISOString(),
  });
});

router.use(verifyJWT);

router.post(
  "/generate",
  [
    body("dailyHoursAvailable")
      .optional()
      .isFloat({ min: 0.5, max: 16 })
      .withMessage("Daily hours must be between 0.5 and 16"),
  ],
  validate,
  generatePlan
);

router.get("/today", getTodaysPlan);
router.get("/week", getWeekPlan);
router.get("/all", getFullPlan);
router.get("/insights", getInsights);
router.post("/pull-next", pullNextEntryToToday);

router.delete("/clear", clearPlan);
router.delete("/entries/:entryId", deleteEntry);

router.patch(
  "/entries/:entryId",
  [
    body("status")
      .isIn(["pending", "done", "missed"])
      .withMessage("Status must be pending, done, or missed"),
  ],
  validate,
  updateEntry
);

export default router;

