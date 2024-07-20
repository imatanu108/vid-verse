import mongoose, { Schema } from "mongoose";

const savedTweetSchema = new Schema(
    {
        tweets: [
            {
                type: Schema.Types.ObjectId,
                ref: "Tweet"
            }
        ],
        savedBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    },
    {
        timestamps: true
    }
)

export const SavedTweet = mongoose.model("SavedTweet", savedTweetSchema)