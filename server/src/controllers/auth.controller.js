import { User } from "../models/user.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

// ── Cookie options ────────────────────────────────────────────────────────────
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
};

const generateTokens = async (user) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

// ── POST /api/auth/signup ─────────────────────────────────────────────────────
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, "An account with this email address already exists. Please log in instead.");
  }

  const user = await User.create({ name, email, password });
  const { accessToken, refreshToken } = await generateTokens(user);

  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    dailyStudyHours: user.dailyStudyHours,
    onboardingComplete: user.onboardingComplete,
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    .json(new ApiResponse(201, { user: safeUser, accessToken }, "Account created successfully"));
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "No account found with this email. Please check your spelling or sign up.");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect password. Please verify and try again.");
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  const safeUser = {
    _id: user._id,
    name: user.name,
    email: user.email,
    dailyStudyHours: user.dailyStudyHours,
    onboardingComplete: user.onboardingComplete,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, { user: safeUser, accessToken }, "Logged in successfully"));
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ── POST /api/auth/refresh-token ──────────────────────────────────────────────
export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  let decoded;
  try {
    const jwt = (await import("jsonwebtoken")).default;
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id);
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw new ApiError(401, "Refresh token mismatch — please log in again");
  }

  const { accessToken, refreshToken } = await generateTokens(user);

  return res
    .status(200)
    .cookie("accessToken", accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    })
    .cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "User fetched successfully"));
});

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, dailyStudyHours, onboardingComplete } = req.body;

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (dailyStudyHours !== undefined) updates.dailyStudyHours = dailyStudyHours;
  if (onboardingComplete !== undefined) updates.onboardingComplete = onboardingComplete;

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, { user }, "Profile updated successfully"));
});

// ── DELETE /api/auth/me ───────────────────────────────────────────────────────
export const deleteAccount = asyncHandler(async (req, res) => {
  const { Subject } = await import("../models/subject.model.js");
  const { StudyPlan } = await import("../models/studyPlan.model.js");

  await Subject.deleteMany({ userId: req.user._id });
  await StudyPlan.deleteMany({ userId: req.user._id });
  await User.findByIdAndDelete(req.user._id);

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Account deleted successfully"));
});

