import { Router } from "express";
import {
  changeCurrentPassword,
  forgotPasswordRequest,
  getCurrentUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  registerUser,
  resendVerificationEmail,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { userRegistrationValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router
  .route("/register")
  // .post(userRegistrationValidator(), validate, registerUser);
  .post(upload.single("avatar"), registerUser);

router.route("/login").post(loginUser);
router.route("/logout").get(logOutUser);
router.route("/verify/:token").get(verifyEmail);
router.route("/resend-verify-email").post(resendVerificationEmail);
router.route("/forgotpassword").post(forgotPasswordRequest);
router.route("/changepassword").post(changeCurrentPassword);
router.route("/profile").get(getCurrentUser);
router.route("/refresh-accesstoken").post(refreshAccessToken);

export default router;
