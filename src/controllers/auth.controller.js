import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

const registerUser = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const loginUser = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const logOutUser = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const verifyEmail = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const resendVerificationEmail = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const refreshAccessToken = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const forgotPasswordRequest = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

const getCurrentUser = asyncHandler(async (req, res) => {

  res.status(200).json(new ApiResponse(200, { message: "ok" }));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  verifyEmail,
  resendVerificationEmail,
  refreshAccessToken,
  forgotPasswordRequest,
  changeCurrentPassword,
  getCurrentUser,
};
