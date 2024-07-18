import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js"
import mongoose from "mongoose"
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelUsername } = req.params

    if (!channelUsername) {
        throw new ApiError(400, "Channel username is missing!")
    }

    const channel = await User.findOne({
        username: channelUsername
    })

    if (!channel) {
        throw new ApiError(404, "Channel does not exist.")
    }

    const subscription = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(String(req.user._id)),
                channel: new mongoose.Types.ObjectId(String(channel._id))
            }
        }
    ])

    let responseData;
    let message;

    if (subscription && subscription.length > 0) {
        const existingSubscription = subscription.shift();
        await Subscription.deleteOne({ _id: existingSubscription._id });
        responseData = existingSubscription;
        message = "Subscription removed successfully.";
    } else {
        const newSubscription = await Subscription.create({
            subscriber: req.user._id,
            channel: channel._id
        });

        if (!newSubscription) {
            throw new ApiError(500, "Failed to create subscription.");
        }
        responseData = newSubscription;
        message = "Subscription added successfully.";
    }

    return res.status(200).json(
        new ApiResponse(
            200,
            responseData,
            message
        )
    );
});


// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelUsername } = req.params

    if (!channelUsername) {
        throw new ApiError(400, "Channel username is missing!")
    }

    const channel = await User.findOne({
        username: channelUsername
    })

    if (!channel) {
        throw new ApiError(404, "Channel does not exist.")
    }

    const channelSubscriptions = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(String(channel._id))
            }
        },
        {
            $project: {
                subscriber: 1
            }
        }
    ])

    // Check if the subscriber is subscribed to any channels
    if (channelSubscriptions.length === 0) {
        return res.status(200).json(
            new ApiResponse(
                200,
                [],
                "No subscribers found for this channel."
            )
        );
    }

    // Extract subscriber IDs from the subscriptions
    // let channelSubscribers = []
    // channelSubscriptions.map((subscription) => channelSubscribers.push(subscription.subscriber))

    const channelSubscribers = channelSubscriptions.map(subscription => subscription.subscriber);

    // Return the list of subscriber IDs
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelSubscribers,
                "Channel subscribers fetched successfully."
            )
        )
})


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
        throw new ApiError(400, "Channel username is missing!")
    }

    const user = await User.findOne({ username })

    if (!user) {
        throw new ApiError(404, "User does not exist.")
    }

    const channelsSubscribedTo = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(String(user._id))
            }
        },
        {
            $project: {
                channel: 1
            }
        }
    ])

    // Check if the subscriber is subscribed to any channels
    if (channelsSubscribedTo.length === 0) {
        return res.status(200).json(
            new ApiResponse(
                200,
                [],
                "No subscriptions found for this user."
            )
        );
    }

    const subscribedChannels = channelsSubscribedTo.map((subscription => subscription.channel))

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                subscribedChannels,
                "Subscribed channels fetched successfully."
            )
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}