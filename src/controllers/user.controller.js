import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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
        coverImage: coverImageUploadResult?.url,
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

export { registerUser }