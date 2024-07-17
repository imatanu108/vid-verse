import { Subscription } from "../models/subscription.model";
import { User } from "../models/user.model.js"
import mongoose from "mongoose"
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!channelId.trim()) {
        throw new ApiError(400, "Channel ID is missing!")
    }

    const subscription = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(String(req.user._id)),
                channel: new mongoose.Types.ObjectId(String(channelId))
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
            channel: channelId
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
    const { channelId } = req.params

    if (!channelId.trim()) {
        throw new ApiError(400, "Channel ID is missing!")
    }

    const channelSubscriptions = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(String(channelId))
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
    const { subscriberId } = req.params

    if (!subscriberId.trim()) {
        throw new ApiError(400, "Subscriber ID is missing!")
    }

    const channelsSubscribedTo = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(String(subscriberId))
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