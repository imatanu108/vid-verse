import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { SavedTweet } from "../models/savedTweet.model.js";


const toggleSaveTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(400, "Tweet Id is missing.")
    }

    if (!mongoose.isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet Id format.")
    }

    let savedTweets = await SavedTweet.findOne({
        savedBy: new mongoose.Types.ObjectId(String(req.user._id))
    })

    // If no savedTweets exist, create a new document
    if (!savedTweets) {
        savedTweets = new SavedTweet({
            savedBy: req.user._id,
            tweets: []
        })
    }

    const isTweetSaved = savedTweets.tweets.includes(tweetId)

    if (isTweetSaved) {
        const tweetIndex = savedTweets.tweets.indexOf(tweetId)
        savedTweets.tweets.splice(tweetIndex, 1)
    } else {
        savedTweets.tweets.push(tweetId)
    }

    try {
        await savedTweets.save({ validateBeforeSave: false })
    } catch (error) {
        throw new ApiError(400, "Update Error: " + error.message)
    }

    const message = isTweetSaved ? "Tweet unsaved successfully." : "Tweet saved successfully."

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                savedTweets,
                message
            )
        )
})

const getSavedTweets = asyncHandler(async (req, res) => {

    let savedTweets;

    try {
        savedTweets = await SavedTweet.aggregate([
            {
                $match: {
                    savedBy: new mongoose.Types.ObjectId(String(req.user._id))
                }
            },
            {
                $lookup: {
                    from: "tweets",
                    localField: "tweets",
                    foreignField: "_id",
                    as: "tweets",
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
            }
        ])
    } catch (error) {
        throw new ApiError(500, "Aggregation Error: " + error.message)
    }

    let responseMessage = "Tweets fetched Successfully.";
    let responseData = savedTweets[0] || {};

    if (!savedTweets[0].tweets || savedTweets[0].tweets.length === 0) {
        responseMessage = "No saved tweets found.";
        responseData = {};
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                responseData,
                responseMessage
            )
        )
})


export {
    toggleSaveTweet,
    getSavedTweets
}