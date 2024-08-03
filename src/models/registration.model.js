import mongoose, { Schema } from "mongoose";

const registrationSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        verificationOTP: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expires: 1200,
        }
    }
)

export const Registration = mongoose.model("Registration", registrationSchema)