import { validationResult } from "express-validator";
import { ApiError } from "../utils/api-error.js";

/**
 * Run after express-validator rules.
 * If any rule failed, collect all errors and throw a 422 ApiError.
 */
export const validate = (req, _res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const extractedErrors = errors.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  const friendlyMessage = extractedErrors
    .map((e) => e.message)
    .filter(Boolean)
    .join(". ");

  throw new ApiError(
    422,
    friendlyMessage || "Please correct the highlighted fields and try again",
    extractedErrors
  );
};

