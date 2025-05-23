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
  resetPassword,
  verifyEmail,
} from "../controllers/auth.controller.js";
import { userLoginValidator, userRegistrationValidator } from "../validators/index.js";
import { validate } from "../middlewares/validator.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

router
  .route("/register")
  // .post(userRegistrationValidator(), validate,upload.single("avatar"), registerUser);
  .post(upload.single("avatar"), registerUser);

router.route("/login").post(userLoginValidator(), validate, loginUser);
router.route("/logout").get(verifyJwt, logOutUser);
router.route("/verify/:token").get(verifyEmail);
router.route("/resend-verify-email").post(resendVerificationEmail);
router.route("/forgotpassword").post(forgotPasswordRequest);
router.route("/resetpassword/:token").post(resetPassword);
router.route("/changepassword").post(verifyJwt, changeCurrentPassword);
router.route("/profile").get(verifyJwt, getCurrentUser);
router.route("/refresh-accesstoken").post(refreshAccessToken);

export default router;
