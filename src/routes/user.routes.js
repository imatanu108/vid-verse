import { Router } from "express";
import { 
    changeCurrentPassword,
    getCurrentUser,
    loginUser, 
    logoutUser, 
    refershAccessToken, 
    registerUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        }, 
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser
)

router.route("/login").post(loginUser)
router.route("/update-avatar").post(
    upload.single("avatar"),
    updateUserAvatar
)
router.route("/update-cover-image").post(
    upload.single("coverImage"),
    updateUserCoverImage
)

// secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refershAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").post(verifyJWT, getCurrentUser)
router.route("/update-user").post(verifyJWT, updateAccountDetails)

// The .post() method in Express.js is used to define a route that responds to HTTP POST requests. 

export default router