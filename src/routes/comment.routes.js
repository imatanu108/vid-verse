import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    addVideoComment,
    addTweetComment,
    getVideoComments,
    getTweetComments,
    deleteComment,
    updateComment
} from "../controllers/comment.controller.js";

const router = Router();

router.use(verifyJWT);

router
    .route("/v/:videoId")
    .get(getVideoComments)
    .post(addVideoComment)

router
    .route("/t/:tweetId")
    .get(getTweetComments)
    .post(addTweetComment)

router
    .route("/:commentId")
    .patch(updateComment)
    .delete(deleteComment)

export default router