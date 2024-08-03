import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Registration } from "../models/registration.model.js";
import { sendVerificationMail, sendForgotPasswordMail } from "../utils/sendEmail.js";
import jwt from 'jsonwebtoken';
import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Tweet } from "../models/tweet.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Report } from "../models/report.model.js";
import { Playlist } from "../models/playlist.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { encrypt, decrypt } from "../utils/crypto.js";


// pre-defined method for generating access and refresh tokens 
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        // validating user
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken

        // updating the user in database
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}


// User methods -->

const emailRegistration = asyncHandler(async (req, res) => {
    const { email } = req.body

    if (!email || !email.trim()) {
        throw new ApiError(400, "Email is required.")
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
        throw new ApiError(400, "Invalid email address format.");
    }

    const existedUser = await User.findOne({ email })

    if (existedUser) {
        throw new ApiError(409, "This email is already linked to an user.")
    }

    try {
        await Registration.findOneAndDelete({ email })
    } catch (error) {
        throw new ApiError(400, "Something went wrong while deleting the previous registration with the same email.")
    }

    const registration = await Registration.create({ email })

    if (!registration) {
        throw new ApiError(500, "Something went wrong while registering.")
    }

    const verificationOTP = Math.floor(Math.random() * 900000) + 100000;

    console.log("verificationOTP: ", verificationOTP)

    registration.verificationOTP = verificationOTP

    try {
        await registration.save({ validateBeforeSave: false });
    } catch (error) {
        throw new ApiError(500, "Error while saving registration: " + error.message);
    }

    try {
        await sendVerificationMail(email, verificationOTP);
    } catch (error) {
        throw new ApiError(500, "Error while sending verification email: " + error.message);
    }

    // encrypting email before sending through cookies
    const encryptedEmail = encrypt(email)

    const cookiesOptions = {
        httpOnly: true,
        secure: true,
        maxAge: 20 * 60 * 1000,
    }

    return res
        .status(200)
        .cookie("encryptedEmail", encryptedEmail, cookiesOptions)
        .json(
            new ApiResponse(
                200,
                null,
                "OTP sent successfuly. Please verify your email."
            )
        )

})


const verifyEmail = asyncHandler(async (req, res) => {

    const { verificationOTP } = req.body;

    const encryptedEmail = req.cookies.encryptedEmail

    if (!encryptedEmail) {
        throw new ApiError(400, "Session expired.")
    }

    // decrypting the email
    const email = decrypt(encryptedEmail.encryptedData, encryptedEmail.iv)

    if (!email) {
        throw new ApiError(400, "Something went wrong while decryption.")
    }

    const registration = await Registration.findOne({ email, verificationOTP });

    if (!registration) {
        throw new ApiError(400, "Invalid or expired OTP.");
    }

    try {
        await Registration.findOneAndDelete({ email })
    } catch (error) {
        throw new ApiError(500, "Something went wrong while deleting the old registration.")
    }

    const cookiesOptions = {
        httpOnly: true,
        secure: true,
        maxAge: 30 * 60 * 1000,
    }

    // encrypting verified email
    const verifiedEmail = encrypt(email)

    return res
        .status(200)
        .cookie("verifiedEmail", verifiedEmail, cookiesOptions)
        .json(
            new ApiResponse(
                200,
                {
                    email,
                    verified: true
                },
                "Email verification successful."
            )
        )

})


const registerUser = asyncHandler(async (req, res) => {
    // complete registration after email verification
    // 1. get user details from frontend (get email from the cookeis after verifying email)
    // 2. validation - if valid data or not (e.g. empty field)
    // 3. check if user already exists: same username or email
    // 4. check for images and check for avatars
    // 5. upload them to cloudinary, check if uploaded or not
    // 6. create user object - create entry in db
    // 7. remove password and refresh token field from response
    // 8. check for user creation 
    // 9. return response


    // 1. Getting user details

    const verifiedEmail = req.cookies.verifiedEmail

    if (!verifiedEmail) {
        throw new ApiError(400, "Session expired.")
    }

    const email = decrypt(verifiedEmail.encryptedData, verifiedEmail.iv)

    if (!email) {
        throw new ApiError(400, "Something went wrong while decryption.")
    }

    const { fullName, username, password } = req.body

    // console.log("email:", email)
    // console.log("username:", username)

    // 2. Basic Validation

    if (
        [fullName, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required!")
    }

    // username validation
    const usernamePattern = /^[a-zA-Z0-9-_]+$/;

    if (!usernamePattern.test(username)) {
        throw new ApiError(400, "Invalid username: only letters, numbers, hyphens, and underscores are allowed.")
    }

    // 3. checking for existing user

    const existedUserWithEmail = await User.findOne({ email })

    if (existedUserWithEmail) {
        throw new ApiError(409, "User with email already exists")
    }

    const existedUserWithUsername = await User.findOne({ email })

    if (existedUserWithUsername) {
        throw new ApiError(409, "User with username already exists")
    }

    // 4. check for images and check for avatars

    let avatarLocalPath;
    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    }

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // avatar is required, but cover image is optional
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required!");
    }

    // 5. upload them to cloudinary, check if uploaded or not

    const avatarUploadResult = await uploadOnCloudinary(avatarLocalPath, "image")
    const coverImageUploadResult = await uploadOnCloudinary(coverImageLocalPath, "image")

    // checking if avatar is uploaded successfully
    if (!avatarUploadResult) {
        throw new ApiError(400, "Avatar upload failed!");
    }

    // this will check the cover image upload only if the user uploaded a cover image 
    if (coverImageLocalPath && !coverImageUploadResult) {
        throw new ApiError(400, "Cover image upload failed!");
    }

    // 6. create user object - create entry in db

    const user = await User.create({
        fullName,
        avatar: avatarUploadResult.url,
        coverImage: coverImageUploadResult?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // 7. checking if user is created and removing password and refreshToken

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user!")
    }

    // 8. returning response

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully!")
    )
})


const loginUser = asyncHandler(async (req, res) => {

    // 1. getting user details

    // Needs only one form field for username or email
    const { usernameOrEmail, password } = req.body

    // email or username is required
    if (!usernameOrEmail) {
        throw new ApiError(400, "email or username is required!")
    }
    if (!password) {
        throw new ApiError(400, "password is required!")
    }

    // 2. finding user by either email or username

    const user = await User.findOne({
        $or: [
            { email: usernameOrEmail },
            { username: usernameOrEmail }
        ]
    })

    // handling user not found
    if (!user) {
        throw new ApiError(404, "User not found, please check username or password!")
    }

    // 3. Checking is password correct or not

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(404, "Password is incorrect!")
    }

    // 4. Generating Access and refersh tokens

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

    // fetching updated user from the database and removing unwanted attributes (such as password) before sending respond

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    // generating cookies

    const cookiesOptions = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, cookiesOptions)
        .cookie("refreshToken", refreshToken, cookiesOptions)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, // sending loggedin user data as user data
                    accessToken,
                    refreshToken
                },
                "User logged in successfully."
            )
        )

})


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const cookiesOptions = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", cookiesOptions)
        .clearCookie("refreshToken", cookiesOptions)
        .json(
            new ApiResponse(200, "User logged out successfully!")
        )
})


const refreshAccessToken = asyncHandler(async (req, res) => {
    try {

        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

        if (!incomingRefreshToken) {
            throw new ApiError(401, "Unauthorized request!")
        }

        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid Refresh Token!")
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh Token is expired or used.")
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id)

        const cookiesOptions = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, cookiesOptions)
            .cookie("refreshToken", refreshToken, cookiesOptions)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken
                    },
                    "Access token refreshed successfully"
                )
            )

    } catch (error) {
        throw new ApiError(401, error.message || "Invalid Refresh token1")
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmNewPassword } = req.body

    // before run changeCurrentPassword we need to go through verifyJWT middleware to ensure the user is logged in or not, as in this middleware we are setting req.user = user, we can access the req.user from here also as the verifyJWT middleware is alreday ran

    if (newPassword !== confirmNewPassword) {
        throw new ApiError(400, "New password and confirmation password do not match.");
    }

    const user = await User.findById(req.user._id)

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password.")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password changed successfully."
            )
        )

})


const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "Current user fetched successfully."
            )
        )
})


const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email, username } = req.body

    // while updating files there should be a different end-point

    if (!fullName.trim() || !email.trim() || !username.trim()) {
        throw new ApiError(400, "Full name, email, and username are required.");
    }

    const user = await User.findById(req.user._id).select("-password -refreshToken")

    // changing the full name if modified

    if (fullName && fullName !== user.fullName) {
        user.fullName = fullName
    }

    // Check if the email is already in use by another user

    const isEmailExist = await User.findOne({ email })

    if (isEmailExist && isEmailExist._id.toString() !== user._id.toString()) {
        throw new ApiError(
            400,
            "This email is already linked with another user id."
        )
    }

    user.email = email

    // Check if the username is already in use by another user

    const isUsernameExist = await User.findOne({ username })

    if (isUsernameExist && isUsernameExist._id.toString() !== user._id.toString()) {
        throw new ApiError(
            400,
            "Sorry! This username is not available."
        )
    }

    user.username = username

    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Account updated successfully."
            )
        )
})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, "image")

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading an avatar.")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Avatar updated successfully!"
            )
        )

})


const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing!")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "image")

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading a cover image.")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Cover Image updated successfully!"
            )
        )

})


const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params

    if (!username) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])

    // console.log("channel: ", channel)

    if (!channel?.length) {
        throw new ApiError(404, "Channel does not exists!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "Channel fetched successfully."
            )
        )

})


const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(String(req.user._id))
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                // When the localField is an array, MongoDB will match each element of the array with the foreignField of the other collection, here watchHistory is an array
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner", // here overwriting the owner inside the video document
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
                    // here owner will be structured like owner : [{owner data}] - as its creating documents
                    // to make frontend dev life easy, taking out the first object of the owner[], right here and overwriting owner with it.
                    {
                        $addFields: {
                            owner: {
                                $arrayElemAt: ["$owner", 0] // Get the first element directly
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully."
            )
        )
})


const sendForgotPasswordOTP = asyncHandler(async (req, res) => {
    const { usernameOrEmail } = req.body

    if (!usernameOrEmail || !usernameOrEmail.trim()) {
        throw new ApiError(400, "Email or username is required.")
    }

    const user = await User.findOne({
        $or: [
            { email: usernameOrEmail },
            { username: usernameOrEmail }
        ]
    })

    if (!user) {
        throw new ApiError(404, "User not found.")
    }

    const forgotPasswordOTP = Math.floor(Math.random() * 900000) + 100000;
    user.forgotPasswordOTP = forgotPasswordOTP

    console.log("forgotPasswordOTP: ", forgotPasswordOTP)

    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);
    user.forgotPasswordOtpExpiry = otpExpiry

    try {
        await user.save({ validateBeforeSave: false });
    } catch (error) {
        throw new ApiError(500, "Error while saving user : " + error.message);
    }

    try {
        await sendForgotPasswordMail(user.email, forgotPasswordOTP, user.username);
    } catch (error) {
        throw new ApiError(500, "Error while sending forgot password email: " + error.message);
    }

    const encryptedEmail = encrypt(user.email)

    const cookiesOptions = {
        httpOnly: true,
        secure: true,
        maxAge: 15 * 60 * 1000,
    }

    return res
        .status(200)
        .cookie("encryptedEmail", encryptedEmail, cookiesOptions)
        .json(
            new ApiResponse(
                200,
                null,
                "Forgot password OTP sent successfully."
            )
        )
})


const verifyForgotPasswordOTP = asyncHandler(async (req, res) => {

    const { forgotPasswordOTP } = req.body
    const encryptedEmail = req.cookies.encryptedEmail

    if (!encryptedEmail) {
        throw new ApiError(400, "Session expired.")
    }

    const email = decrypt(encryptedEmail.encryptedData, encryptedEmail.iv)

    if (!email) {
        throw new ApiError(400, "Something went wrong while decryption.")
    }

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(400, "Session expired.")
    }

    if (user.forgotPasswordOTP !== forgotPasswordOTP) {
        throw new ApiError(400, "Invalid OTP.")
    }

    if (user.forgotPasswordOtpExpiry < Date.now()) {
        throw new ApiError(400, "OTP has expired.")
    }

    // reseting user properties after verification
    user.forgotPasswordOTP = null
    user.forgotPasswordOtpExpiry = null

    try {
        await user.save({ validateBeforeSave: false });
    } catch (error) {
        throw new ApiError(500, "Error while saving user: " + error.message);
    }

    const verifiedEmail = encrypt(email)

    const cookiesOptions = {
        httpOnly: true,
        secure: true,
        maxAge: 20 * 60 * 1000,
    }

    return res
        .status(200)
        .cookie("verifiedEmail", verifiedEmail, cookiesOptions)
        .json(
            new ApiResponse(
                200,
                null,
                "Forgot password OTP verified successfully."
            )
        )
})


const forgotPassword = asyncHandler(async (req, res) => {

    const { newPassword } = req.body
    const verifiedEmail = req.cookies.verifiedEmail

    if (!verifiedEmail) {
        throw new ApiError(400, "Sesssion expired.")
    }

    const email = decrypt(verifiedEmail.encryptedData, verifiedEmail.iv)

    if (!email) {
        throw new ApiError(400, "Something went wrong while decryption.")
    }

    if (!newPassword || !newPassword.trim()) {
        throw new ApiError(400, "Password is required.")
    }

    const user = await User.findOne({ email })

    if (!user) {
        throw new ApiError(400, "Forgot password token is invalid or expired.")
    }

    user.password = newPassword

    try {
        await user.save({ validateBeforeSave: false });
    } catch (error) {
        throw new ApiError(500, "Error while saving user: " + error.message);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Password updated successfully."
            )
        )

})


const deleteAccount = asyncHandler(async (req, res) => {
    const { password } = req.body

    if (!password || !password.trim()) {
        throw new ApiError(400, "Password is required.")
    }

    const user = await User.findById(req.user._id)

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(400, "Incorrect password.")
    }

    // deleting other user related documents

    try {
        await Video.deleteMany({
            owner: req.user._id
        })

        await Tweet.deleteMany({
            owner: req.user._id
        })

        await Subscription.deleteMany({
            $or: [
                { subscriber: req.user._id },
                { channel: req.user._id },
            ]
        })

        await Report.deleteMany({
            reportBy: req.user._id
        })

        await Playlist.deleteMany({
            owner: req.user._id
        })

        await Like.deleteMany({
            likedBy: req.user._id
        })

        await Comment.deleteMany({
            owner: req.user._id
        })
    } catch (error) {
        throw new ApiError(500, "Something went wrong while deleting the user || Error: " + error)
    }

    // deleting the user at last

    const deletedUser = await User.findByIdAndDelete(req.user._id)

    if (!deletedUser) {
        throw new ApiError(500, "Something went wrong while deleting the user.")
    }


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deletedUser,
                "Account deleted successfully."
            )
        )
})


export {
    emailRegistration,
    verifyEmail,
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    sendForgotPasswordOTP,
    verifyForgotPasswordOTP,
    forgotPassword,
    deleteAccount
}