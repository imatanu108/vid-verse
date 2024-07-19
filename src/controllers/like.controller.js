import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Like } from "../models/like.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video Id is missing.")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id format.")
    }

    const likeStatus = await Like.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(String(videoId)),
                likedBy: new mongoose.Types.ObjectId(String(req.user._id))
            }
        }
    ])

    if (!likeStatus) {
        throw new ApiError(400, "Something went wrong while fetching the like status.")
    }

    // If there is no like document, create a new one
    if (likeStatus.length === 0) {
        const like = await Like.create({
            video: videoId,
            likedBy: req.user._id
        })

        if (!like) {
            throw new ApiError(400, "Something went wrong while liking the video.")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    like,
                    "Video liked successfully."
                )
            )
    }

    const deleteResponse = await Like.findByIdAndDelete(likeStatus[0]._id)

    if (!deleteResponse) {
        throw new ApiError(400, "Something went wrong while unliking the video.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deleteResponse,
                "Video unliked successfully."
            )
        )
})


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError(400, "Comment Id is missing.")
    }

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment Id format.")
    }

    const likeStatus = await Like.aggregate([
        {
            $match: {
                comment: new mongoose.Types.ObjectId(String(commentId)),
                likedBy: new mongoose.Types.ObjectId(String(req.user._id))
            }
        }
    ])

    if (!likeStatus) {
        throw new ApiError(400, "Something went wrong while fetching the like status.")
    }

    // If there is no like document
    if (likeStatus.length === 0) {
        const like = await Like.create({
            comment: commentId,
            likedBy: req.user._id
        })

        if (!like) {
            throw new ApiError(400, "Something went wrong while liking the comment.")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    like,
                    "Comment is liked successfully."
                )
            )
    }

    const deleteResponse = await Like.findByIdAndDelete(likeStatus[0]._id)

    if (!deleteResponse) {
        throw new ApiError(400, "Something went wrong while unliking the tweet.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deleteResponse,
                "Comment is unliked successfully."
            )
        )

})


const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet Id is missing.")
    }

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id format.")
    }

    const likeStatus = await Like.aggregate([
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(String(tweetId)),
                likedBy: new mongoose.Types.ObjectId(String(req.user._id))
            }
        }
    ])

    if (!likeStatus) {
        throw new ApiError(400, "Something went wrong while fetching the like status.")
    }

    // If there is no like document
    if (likeStatus.length === 0) {
        const like = await Like.create({
            tweet: tweetId,
            likedBy: req.user._id
        })

        if (!like) {
            throw new ApiError(400, "Something went wrong while liking the tweet.")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    like,
                    "Tweet is liked successfully."
                )
            )
    }

    const deleteResponse = await Like.findByIdAndDelete(likeStatus[0]._id)

    if (!deleteResponse) {
        throw new ApiError(400, "Something went wrong while unliking the tweet.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deleteResponse,
                "Tweet is unliked successfully."
            )
        )

})


const getLikedVideos = asyncHandler(async (req, res) => {

    // Fetching all likes by the user
    const userLikeList = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(String(req.user._id))
            }
        }
    ])

    if (!userLikeList) {
        throw new ApiError(400, "Something went wrong while fetching the liked items.")
    }

    let likedVideos = []

    // selecting only those like documents which have the video property
    userLikeList.map((likeObj) => {
        if (likeObj.video) {
            likedVideos.push(likeObj.video)
        }
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideos,
                "Liked videos fetched successfully."
            )
        )
})


const getLikedTweets = asyncHandler(async (req, res) => {

    // Fetching all likes by the user
    const userLikeList = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(String(req.user._id))
            }
        }
    ])

    if (!userLikeList) {
        throw new ApiError(400, "Something went wrong while fetching the liked items.")
    }

    let likedTweets = []

    // selecting only those like documents which have the video property
    userLikeList.map((likeObj) => {
        if (likeObj.tweet) {
            likedTweets.push(likeObj.tweet)
        }
    })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedTweets,
                "Liked tweets fetched successfully."
            )
        )
})


export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos,
    getLikedTweets
}