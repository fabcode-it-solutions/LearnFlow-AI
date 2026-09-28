/**
 * Helper to parse and format API errors into user-friendly messages
 * with context-aware recovery suggestions (e.g. not registered, already registered, validation failed).
 */

export interface ParsedApiError {
  message: string;
  isNotRegistered: boolean;
  isAlreadyRegistered: boolean;
  isNetworkError: boolean;
  isValidationError: boolean;
  fieldErrors?: Record<string, string>;
}

export function parseApiError(err: unknown): ParsedApiError {
  const result: ParsedApiError = {
    message: "An unexpected error occurred. Please try again.",
    isNotRegistered: false,
    isAlreadyRegistered: false,
    isNetworkError: false,
    isValidationError: false,
  };

  if (!err) return result;

  const errorObj = err as {
    response?: {
      status?: number;
      data?: {
        message?: string;
        errors?: Array<{ field?: string; path?: string; message?: string; msg?: string }>;
      };
    };
    code?: string;
    message?: string;
  };

  // Case 1: No response received (Network error, offline, timeout, server down)
  if (!errorObj.response) {
    result.isNetworkError = true;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      result.message = "You appear to be offline. Please check your internet connection.";
    } else if (
      errorObj.code === "ECONNABORTED" ||
      errorObj.message?.toLowerCase().includes("timeout")
    ) {
      result.message = "The request took too long to complete. Please try again.";
    } else {
      result.message = "Unable to connect to the server. Please verify your connection or try again shortly.";
    }
    return result;
  }

  const { status, data } = errorObj.response;
  const rawMessage = (data?.message || "").trim();

  // Check structured validation errors from backend
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    result.isValidationError = true;
    const fieldMap: Record<string, string> = {};
    const messages: string[] = [];

    data.errors.forEach((e) => {
      const field = e.field || e.path || "";
      const msg = e.message || e.msg || "";
      if (field && msg) fieldMap[field] = msg;
      if (msg) messages.push(msg);
    });

    result.fieldErrors = fieldMap;
    if (messages.length > 0) {
      result.message = messages.join(". ");
      return result;
    }
  }

  // Case 2: 404 (Not Found / User not registered)
  if (
    status === 404 ||
    rawMessage.toLowerCase().includes("not found") ||
    rawMessage.toLowerCase().includes("not registered")
  ) {
    result.isNotRegistered = true;
    result.message =
      rawMessage ||
      "This email is not registered yet. Please check your spelling or create an account.";
    return result;
  }

  // Case 3: 409 (Conflict / Account already exists)
  if (
    status === 409 ||
    rawMessage.toLowerCase().includes("already exists")
  ) {
    result.isAlreadyRegistered = true;
    result.message =
      rawMessage ||
      "An account with this email address already exists. Please log in instead.";
    return result;
  }

  // Case 4: 401 (Unauthorized / Wrong credentials)
  if (status === 401) {
    if (rawMessage.toLowerCase().includes("password")) {
      result.message = rawMessage || "Incorrect password. Please verify and try again.";
    } else {
      result.message = rawMessage || "Invalid email or password. Please try again.";
    }
    return result;
  }

  // Case 5: 422 or 400 (Validation / Bad input)
  if (status === 422 || status === 400) {
    result.isValidationError = true;
    result.message = rawMessage || "Please check the entered information and try again.";
    return result;
  }

  // Case 6: 500+ (Server error)
  if (status && status >= 500) {
    result.message =
      rawMessage && !rawMessage.toLowerCase().includes("internal server error")
        ? rawMessage
        : "A server error occurred. Please try again shortly.";
    return result;
  }

  if (rawMessage) {
    result.message = rawMessage;
  }

  return result;
}
