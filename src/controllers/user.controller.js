import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from 'jsonwebtoken';

console.log("THis is User: ", User);


// pre-defined method for generating access and refresh tokens 
const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)

        // console.log("user || generateAccessAndRefreshTokens", user)

        // validating user
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // console.log("Access token || generateAccessAndRefreshTokens", accessToken)
        // console.log("Refresh token || generateAccessAndRefreshTokens", refreshToken)

        user.refreshToken = refreshToken

        // updating the user in database
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}


// User methods -->

const registerUser = asyncHandler(async (req, res) => {
    // 1. get user details from frontend
    // 2. validation - if valid data or not (e.g. empty field)
    // 3. check if user already exists: same username or email
    // 4. check for images and check for avatars
    // 5. upload them to cloudinary, check if uploaded or not
    // 6. create user object - create entry in db
    // 7. remove password and refresh token field from response
    // 8. check for user creation 
    // 9. return response

    // console.log("-------------------------------------------------------------------------")
    // console.log("req.body", req.body)
    // console.log("-------------------------------------------------------------------------")
    // console.log("req.files", req.files)
    // console.log("-------------------------------------------------------------------------")


    // 1. Getting user details

    const { fullName, username, email, password } = req.body
    console.log("email:", email)
    console.log("username:", username)

    // 2. Basic Validation

    if (
        [fullName, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required!")
    }

    // 3. checking for existing user

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    // 4. check for images and check for avatars

    // const avatarLocalPath = req.files?.avatar[0].path;
    // const coverImageLocalPath = req.files?.coverImage[0].path;

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

    const avatarUploadResult = await uploadOnCloudinary(avatarLocalPath)
    const coverImageUploadResult = await uploadOnCloudinary(coverImageLocalPath)

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
    // 1. get user details from frontend (req.body)
    // 2. username or email
    // --> check if user details are matching with any existing user or not(in database)
    // 3. password check
    // 4. generate access and refresh tokens
    // send them to user
    // 5. response logged in


    // 1. getting user details

    // Needs two different form fields for username and email
    // const { email, username, password } = req.body

    // // email or username is required
    // if (!email && !username) {
    //     throw new ApiError(400, "email or username is required!")
    // }

    // if (!password) {
    //     throw new ApiError(400, "password is required!")
    // }

    // // 2. finding user

    // const user = await User.findOne({
    //     $or: [{ username }, { email }]
    // })


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

    console.log("Access token || login", accessToken)
    console.log("Refresh token || login", refreshToken)



    // the user that is available inside this block is still not updated, but that is updated in the database as we've called generateAccessAndRefreshTokens() method using that user._id, so we are againg fetching the user with the same id from the data base, and removing unwanted attributes (such as password)

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


const refershAccessToken = asyncHandler(async (req, res) => {
    try {

        // console.log("req.cookies || refreshAccessToken", req.cookies)

        const incomingRefreshToken = req.cookies?.refreshToken || req.body.refreshToken

        // console.log("incoming refresh token:", incomingRefreshToken)

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
    const { oldPassword, newPassword, confirmNewPassword} = req.body

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
    await user.save({validateBeforeSave: false})

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

    const {fullName, email, username} = req.body
    // while updating files there should be a different end-point

    if (!fullName || !email || !username) {
        throw new ApiError(400, "Full name, email, and username are required.");
    }

    const user = await User.findById(req.user._id).select("-password -refreshToken")

    // changing the full name if modified
    if (fullName && fullName !== user.fullName) {
        user.fullName = fullName
    }

    // Check if the email is already in use by another user
    const isEmailExist = await User.findOne({email})

    if (isEmailExist && isEmailExist._id.toString() !== user._id.toString()) {
        throw new ApiError(
            400,
            "This email is already linked with another user id."
        )
    }

    user.email = email

    // Check if the username is already in use by another user
    const isUsernameExist = await User.findOne({username})

    if (isUsernameExist && isUsernameExist._id.toString() !== user._id.toString()) {
        throw new ApiError(
            400,
            "Sorry! This username is not available."
        )
    }

    user.username = username

    await user.save({validateBeforeSave: false})

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Account updated successfully."
            )
        )
} )


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

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

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

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


export {
    registerUser,
    loginUser,
    logoutUser,
    refershAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}