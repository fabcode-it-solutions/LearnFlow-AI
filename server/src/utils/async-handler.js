/**
 * Wraps an async Express route handler so that any thrown error is
 * forwarded to Express's global error handler via next(err).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export { asyncHandler };

