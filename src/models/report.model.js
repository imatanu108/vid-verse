import mongoose, { Schema } from "mongoose";

const reportSchema = new Schema(
    {
        video: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment"
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet"
        },
        reportBy: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        issue: {
            type: String,
            enum: [
                "Sexual content",
                "Spam or misleading", 
                "Hateful or abusive content", 
                "Violent content", 
                "Copyright violation", 
                "Privacy violation", 
                "Harmful or dangerous acts",
                "Scams/fraud",
                "Others"
            ],
            required: true
        }
    },
    {timestamps: true}
)


export const Report = mongoose.model("Report", reportSchema)