import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedTweets,
    getLikedVideos
} from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/toggle/video/:videoId").post(toggleVideoLike);
router.route("/toggle/tweet/:tweetId").post(toggleTweetLike);
router.route("/toggle/comment/:commentId").post(toggleCommentLike);
router.route("/videos").get(getLikedVideos)
router.route("/tweets").get(getLikedTweets)

export default router