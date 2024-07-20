import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    toggleSaveTweet,
    getSavedTweets
} from "../controllers/savedTweet.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").get(getSavedTweets)

router.route("/:tweetId").patch(toggleSaveTweet)

export default router