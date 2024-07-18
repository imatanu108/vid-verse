import { Router } from 'express';
import {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets,
    getAllTweets
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from '../middlewares/multer.middleware.js';

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .post(
        upload.fields([
            {
                name: "images",
                maxCount: 10
            }
        ]),
        createTweet
    );
router.route("/user/:username").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);
router.route("/find").get(getAllTweets)

export default router