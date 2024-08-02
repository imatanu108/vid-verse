import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const registrationSchema = new Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        verificationToken: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now,
            expiredIn: 3600,
        }
    }
)

registrationSchema.methods.generateVerificationToken = function () {
    return jwt.sign(
        {
            email: this.email
        },
        process.env.VERIFICATION_TOKEN_SECRET,
        {
            expiresIn: process.env.VERIFICATION_TOKEN_EXPIRY
        }
    )
}

export const Registration = mongoose.model("Registration", registrationSchema)