import mongoose from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const createTweet = asyncHandler(async (req, res) => {

    const { content = "" } = req.body

    if ((!req.files || !req.files.images) && (!content || !content.trim())) {
        throw new ApiError(400, "Either text or image is required to create a tweet.");
    }

    let imagesUrlList = [];

    if (req.files && Array.isArray(req.files.images) && req.files.images.length > 0) {
        
        if (req.files.images.length > 10) {
            throw new ApiError(400, "Maximum 10 files can be uploaded at one time.")
        }

        const uploadPromises = req.files.images.map(async (image) => {
            const uploadResult = await uploadOnCloudinary(image.path, "image");
            if (!uploadResult) {
                throw new ApiError(400, "Something went wrong while uploading the file(s).");
            }
            return uploadResult.url;
        });

        // Wait for all image uploads to complete
        imagesUrlList = await Promise.all(uploadPromises);

    }
    // Here, uploadPromises is an array of promises created by mapping over req.files.images. Each promise, when resolved, returns the URL of the uploaded image.
    // Promise.all(uploadPromises) returns a single promise that resolves when all the promises in the uploadPromises array have resolved.
    // The resolved value of Promise.all is an array containing the results of each individual promise in the order they were in the original array.
    // imagesUrlList is assigned this array of results (image URLs).

    const tweet = await Tweet.create({
        content: content,
        images: imagesUrlList,
        owner: req.user._id
    })

    if (!tweet) {
        throw new ApiError("400", "Something went wrong while creating tweet.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweet,
                "Tweet created successfully."
            )
        )
})


const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    const { content } = req.body

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is missing.")
    }

    // Check if videoId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format!");
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found.")
    }

    // Check if the current user is the owner of the tweet
    if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "You don't have the authority to update this tweet.")
    }

    // Ensure that content is not empty if there are no images in the tweet
    if (tweet.images && tweet.images.length === 0) {
        if (!content || !content.trim()) {
            throw new ApiError(400, "Content can not be empty.")
        }

        tweet.content = content
    }

    tweet.content = content;

    await tweet.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweet,
                "Tweet is updated successfully."
            )
        )
})


const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is missing.")
    }

    // Check if videoId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format!");
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found.")
    }

    // Check if the current user is the owner of the tweet
    if (!tweet.owner.equals(req.user._id)) {
        throw new ApiError(403, "You don't have the authority to delete this tweet.")
    }

    const deleteResponse = await Tweet.findByIdAndDelete(tweetId)

    if (!deleteResponse) {
        throw new ApiError(400, "Something went wrong while deleting the tweet.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deleteResponse,
                "The tweet is deleted successfully."
            )
        )
})


const getUserTweets = asyncHandler(async (req, res) => {

    const { username } = req.params
    const { page = 1, limit = 50, sortBy = "createdAt", sortType = "desc" } = req.query

    if (!username) {
        throw new ApiError(400, "username is required.")
    }

    const user = await User.findOne({ username })

    if (!user) {
        throw new ApiError(404, "User does not exist!")
    }


    // Aggregation pipeline to fetch tweets
    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(String(user._id))
            }
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
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0] // Get the first element directly
                }
            }
        },
        {
            $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 }
        },

        {
            $skip: (page - 1) * limit
        },

        {
            $limit: parseInt(limit)
        }
    ])

    // fetching the total number of tweets made by the user
    const totalTweets = await Tweet.countDocuments({
        owner: new mongoose.Types.ObjectId(String(user._id))
    })

    if (!tweets || !totalTweets) {
        throw new ApiError(400, "Something went wrong while fetching tweets.")
    }

    if (totalTweets === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        tweets: [],
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalTweets: 0
                    },
                    "This user/channel dont't have any tweets."
                )
            )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    tweets,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalTweets / limit),
                    totalTweets
                }
            )
        )
})


const getAllTweets = asyncHandler(async (req, res) => {

    const { page = 1, limit = 20, query, sortBy = "createdAt", sortType = "desc" } = req.query

    // pipeline to filter and find tweets
    const primaryPipeline = [
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
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                }
            }
        },
        {
            $match: {
                ...(query && {
                    $or: [
                        { content: { $regex: query, $options: 'i' } },
                        { "owner.fullName": { $regex: query, $options: 'i' } },
                        { "owner.username": { $regex: query, $options: 'i' } },
                    ]
                })
            }
        }
    ]

    // pipeline for pagination
    const secendoryPipeline = [
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

    // Fetch tweets with the combined pipeline
    const tweets = await Tweet.aggregate([
        ...primaryPipeline,
        ...secendoryPipeline
    ])

    // Count total tweets matching the filters
    const totalTweets = await Tweet.aggregate([
        ...primaryPipeline,
        { $count: "totalTweetsCount" }
    ])

    if (!tweets || !totalTweets) {
        throw new ApiError(400, "Something went wrong while fetching tweets!")
    }

    const totalTweetsCount = totalTweets.length > 0 ? totalTweets[0].totalTweetsCount : 0;

    if (totalTweetsCount === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        tweets: [],
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalTweets: 0
                    },
                    "Sorry! No tweets found."
                )
            )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    tweets,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalTweetsCount / limit),
                    totalTweets: totalTweetsCount
                },
                "Tweets fetched successfully."
            )
        )

})


const getTweetById = asyncHandler(async (req, res) => {

    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet ID is missing!")
    }

    // Check if videoId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID format!");
    }

    let tweet;

    try {
        tweet = await Tweet.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(String(tweetId))
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "tweet",
                    as: "likes",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "likedBy",
                                foreignField: "_id",
                                as: "likedBy",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                likedBy: { $arrayElemAt: ["$likedBy", 0] }
                            }
                        },
                        {
                            $project: {
                                likedBy: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "tweet",
                    as: "comments",
                    pipeline: [
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
                            }
                        },
                        {
                            $addFields: {
                                owner: { $arrayElemAt: ["$owner", 0] }
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    likesCount: {
                        $size: "$likes"
                    },
                    commentsCount: {
                        $size: "$comments"
                    },
                    isLikedbyUser: {
                        $cond: {
                            if: { $in: [req.user._id, "$likes.likedBy._id"] },
                            then: true,
                            else: false
                        }
                    }
                }
            }
        ])

        if (!tweet || tweet.length === 0) {
            throw new ApiError(404, "Video not found.");
        }

    } catch (error) {
        throw new ApiError(500, "Aggregation error: " + err.message);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweet[0],
                "tweet found successfully."
            )
        )
})


export {
    createTweet,
    updateTweet,
    deleteTweet,
    getUserTweets,
    getAllTweets,
    getTweetById
}