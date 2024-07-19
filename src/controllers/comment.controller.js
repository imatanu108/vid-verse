import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";


const addVideoComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { content } = req.body

    if (!videoId) {
        throw new ApiError(400, "Video Id is missing!")
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "Content is required")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format.")
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(400, "Something went wrong while adding a comment.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                comment,
                "Comment added successfully."
            )
        )

})


const addTweetComment = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!tweetId) {
        throw new ApiError(400, "Tweet Id is missing!")
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "Content is required")
    }

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format.")
    }

    const comment = await Comment.create({
        content,
        tweet: tweetId,
        owner: req.user._id
    })

    if (!comment) {
        throw new ApiError(400, "Something went wrong while adding a comment.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                comment,
                "Comment added successfully."
            )
        )

})


const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params
    const { content } = req.body

    if (!commentId) {
        throw new ApiError(400, "Comment Id is missing!")
    }

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID format.")
    }

    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment does not exist!")
    }

    // verifying the comment owner before deleting
    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to update this comment.");
    }

    if (!content || !content.trim()) {
        throw new ApiError(400, "Content can not be empty.")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content,

            },
        },
        {
            new: true
        }
    )

    if (!comment) {
        throw new ApiError(400, "Something went wrong while updating the comment.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedComment,
                "Comment updated successfully."
            )
        )

})


const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params

    if (!commentId) {
        throw new ApiError(400, "Comment Id is missing!")
    }

    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID format.")
    }

    const comment = await Comment.findById(commentId)
    
    if (!comment) {
        throw new ApiError(404, "Comment does not exist!")
    }

    // verifying the comment owner before deleting
    if (!comment.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to delete this comment.");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId)

    if (!deletedComment) {
        throw new ApiError(400, "Something went wrong while deleting the comment.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deletedComment,
                "Comment deleted successfully."
            )
        )
})


const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 50, sortBy = "createdAt", sortType = "desc" } = req.query

    if (!videoId) {
        throw new ApiError(400, "Video Id is missing!")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format.")
    }

    // pipeline to filter data
    const primaryPipeline = [
        {
            $match: {
                video: new mongoose.Types.ObjectId(String(videoId))
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            },
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                }
            }
        }
    ]

    // pipeline for pagination
    const secondaryPipeline = [
        {
            $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 }
        },

        {
            $skip: (page - 1) * limit
        },

        {
            $limit: parseInt(limit)
        }
    ]

    let comments, totalComments;

    try {
        comments = await Comment.aggregate([...primaryPipeline, ...secondaryPipeline]);

        totalComments = await Comment.countDocuments({
            video: new mongoose.Types.ObjectId(String(videoId))
        });
    } catch (err) {
        throw new ApiError(500, "Aggregation error: " + err.message);
    }

    if (!comments) {
        throw new ApiError(400, "Something went wrong while fetching comments.");
    }

    if (totalComments === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        comments: [],
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalTweets: 0
                    },
                    "No comments found for this video."
                )
            )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    comments,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalComments / limit),
                    totalComments
                },
                "Comments fetched successfully."
            )
        )
})


const getTweetComments = asyncHandler(async (req, res) => {

    const { tweetId } = req.params
    const { page = 1, limit = 50, sortBy = "createdAt", sortType = "desc" } = req.query

    if (!tweetId) {
        throw new ApiError(400, "Tweet Id is missing!")
    }

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format.")
    }

    // pipeline to filter data
    const primaryPipeline = [
        {
            $match: {
                tweet: new mongoose.Types.ObjectId(String(tweetId))
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            },
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                }
            }
        }
    ]

    // pipeline for pagination
    const secondaryPipeline = [
        {
            $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 }
        },

        {
            $skip: (page - 1) * limit
        },

        {
            $limit: parseInt(limit)
        }
    ]

    let comments, totalComments;

    try {
        comments = await Comment.aggregate([...primaryPipeline, ...secondaryPipeline]);
        
        totalComments = await Comment.countDocuments({
            tweet: new mongoose.Types.ObjectId(String(tweetId))
        });
    } catch (err) {
        throw new ApiError(500, "Aggregation error: " + err.message);
    }

    if (!comments) {
        throw new ApiError(400, "Something went wrong while fetching comments.");
    }


    if (totalComments === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        comments: [],
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalTweets: 0
                    },
                    "No comments found for this tweet."
                )
            )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    comments,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalComments / limit),
                    totalComments
                },
                "Comments fetched successfully."
            )
        )
})



export {
    addVideoComment,
    addTweetComment,
    updateComment,
    deleteComment,
    getVideoComments,
    getTweetComments
}