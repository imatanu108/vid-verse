import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import mongoose from "mongoose";


const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description } = req.body

    if (!title || !title.trim() || !description || !description.trim()) {
        throw new ApiError(400, "Title and description are required!")
    }

    // let videoFileLocalPath;
    // if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
    //     videoFileLocalPath = req.files.videoFile[0].path
    // }

    // let thumbnailLocalPath;
    // if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
    //     thumbnailLocalPath = req.files.thumbnail[0].path
    // }

    const getFileLocalPath = (fileArray) => {
        return req.files && Array.isArray(req.files[fileArray]) && req.files[fileArray].length > 0
            ? req.files[fileArray][0].path
            : null;
    };

    const videoFileLocalPath = getFileLocalPath('videoFile');
    const thumbnailLocalPath = getFileLocalPath('thumbnail');


    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required!");
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required!");
    }

    // uploading files on cloudinary
    const videoUploadResult = await uploadOnCloudinary(videoFileLocalPath, "video");
    const thumbnailUploadResult = await uploadOnCloudinary(thumbnailLocalPath, "image");

    if (!videoUploadResult) {
        throw new ApiError(400, "Video upload failed!")
    }

    if (!thumbnailUploadResult) {
        throw new ApiError(400, "Thumbnail upload failed!")
    }

    // creating video object (db entry)

    const video = await Video.create({
        title,
        description,
        videoFile: videoUploadResult.url,
        thumbnail: thumbnailUploadResult.url,
        duration: videoUploadResult.duration,
        owner: req.user._id,
        isPublished: true,
        views: 0
    })

    if (!video) {
        throw new ApiError(400, "Something went wrong while uploading the video.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video uploaded successfully!"
            )
        )
})


const getVideoById = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video ID is missing!")
    }

    // Check if videoId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format!");
    }

    let video;

    try {
        video = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(String(videoId))
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "likedBy",
                                foreignField: "_id",
                                as: "likedBy",
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
                                likedBy: { $arrayElemAt: ["$likedBy", 0] }
                            }
                        },
                        {
                            $project: {
                                likedBy: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "comments",
                    localField: "_id",
                    foreignField: "video",
                    as: "comments",
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
            },
            {
                $addFields: {
                    likesCount: {
                        $size: "$likes"
                    },
                    commentsCount: {
                        $size: "$comments"
                    },
                    isLikedbyUser: {
                        $cond: {
                            if: { $in: [req.user._id, "$likes.likedBy._id"] },
                            then: true,
                            else: false
                        }
                    }
                }
            }
        ])

        if (!video || video.length === 0) {
            throw new ApiError(404, "Video not found.");
        }

        // incrementing video views
        await Video.findByIdAndUpdate(videoId, {
            $inc: { views: 1 }
        });

    } catch (error) {
        throw new ApiError(500, "Aggregation error: " + err.message);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video[0],
                "Video found successfully."
            )
        )
})


const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video ID is missing!")
    }

    // Check if videoId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video does not exist!")
    }

    // verifying the video owner before deleting
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to update this video.");
    }

    // updating title and description
    const { title, description } = req.body

    // updating title and description only if the user modifying it.
    if (title.trim() && title.trim() !== video.title) {
        video.title = title
    }

    if (description.trim() && description.trim() !== video.description) {
        video.description = description
    }

    // updating thumbnail if the user reuploading the thumbnail.
    let thumbnailLocalPath = null;
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    if (thumbnailLocalPath) {
        const thumbnailUploadResult = await uploadOnCloudinary(thumbnailLocalPath, "image");

        if (!thumbnailUploadResult) {
            throw new ApiError(400, "Thumbnail upload failed!")
        }

        video.thumbnail = thumbnailUploadResult.url
    }

    await video.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video details updated successfully."
            )
        )
})


const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video ID is missing!")
    }

    // Check if videoId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format!");
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video does not exist!")
    }

    // verifying the video owner before deleting
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to delete this video.");
    }

    // deleting video
    const deleteResponse = await Video.findByIdAndDelete(videoId)

    if (!deleteResponse) {
        throw new ApiError(400, "Something went wrong while deleting the video.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deleteResponse,
                "The video is deleted successfully."
            )
        )
})


const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    if (!videoId) {
        throw new ApiError(400, "Video ID is missing!")
    }

    // Check if videoId is a valid MongoDB ObjectId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID format!");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video does not exist!")
    }

    // verifying the video owner before deleting
    if (!video.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to publish or unpublish this video.");
    }

    // Toggle the publish status
    video.isPublished = !video.isPublished;

    await video.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isVideoPublished: video.isPublished },
                "Publish status is updated successfully."
            )
        )
})


const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc" } = req.query

    const pipeline = [];

    // Fetching those videos also whose Channel name and channels username matches with the query

    // Lookup stage to join with User collection
    const lookupStage = {
        $lookup: {
            from: "users", // The name of your User collection
            localField: "owner",
            foreignField: "_id",
            as: "ownerDetails",
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
    };
    pipeline.push(lookupStage);


    // addFields stage to destructure the first element of ownerDetails array
    const addFieldsStage = {
        $addFields: {
            ownerDetails: { $arrayElemAt: ["$ownerDetails", 0] } // Get the first element directly
        }
    }
    pipeline.push(addFieldsStage);

    // Match stage to filter by userId and search query
    const matchStage = {
        $match: {
            ...(query && {
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { description: { $regex: query, $options: 'i' } },
                    { "ownerDetails.fullName": { $regex: query, $options: 'i' } },
                    { "ownerDetails.username": { $regex: query, $options: 'i' } },
                ]
            })
        }
    };
    pipeline.push(matchStage);

    // Sort stage
    const sortStage = {
        $sort: {
            [sortBy]: sortType === 'asc' ? 1 : -1
        }
    };
    pipeline.push(sortStage);

    // Pagination stage
    const skipStage = {
        $skip: (page - 1) * limit
    };
    pipeline.push(skipStage);

    const limitStage = {
        $limit: parseInt(limit)
    };
    pipeline.push(limitStage);

    // Execute the aggregation
    const videos = await Video.aggregate(pipeline);

    // Fetch the total count of videos matching the filters
    const totalVideos = await Video.aggregate([
        { ...lookupStage },
        { ...addFieldsStage },
        { ...matchStage },
        { $count: "totalVideosCount" }
    ]);

    const totalVideosCount = totalVideos.length > 0 ? totalVideos[0].totalVideosCount : 0;

    if (totalVideosCount === 0) {
        return res
            .status(404)
            .json(
                new ApiResponse(
                    404,
                    [],
                    "No videos found!"
                )
            )
    }

    if (!videos || !totalVideosCount) {
        throw new ApiError(400, "Something went wrong while fetching the videos.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videos,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalVideosCount / limit),
                    totalVideos: totalVideosCount
                },
                "Videos fetched successfully!"
            )
        )
})


const getVideosByChannel = asyncHandler(async (req, res) => {
    const { username } = req.params
    const { page = 1, limit = 50, sortBy = "createdAt", sortType = "desc" } = req.query

    if (!username) {
        throw new ApiError(400, "Channel username is required!")
    }

    const channel = await User.findOne({ username })

    if (!channel) {
        throw new ApiError(404, "Channel does not exist.")
    }

    const channelVideos = await Video.aggregate([

        { $match: { owner: new mongoose.Types.ObjectId(String(channel._id)) } },

        { $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 } },

        { $skip: (page - 1) * limit },

        { $limit: parseInt(limit) }

    ])

    if (!channelVideos) {
        throw new ApiError(400, "Something went wrong while fetching the videos.")
    }

    const totalVideos = await Video.countDocuments({
        owner: new mongoose.Types.ObjectId(String(channel._id))
    })

    if (totalVideos === 0) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    {
                        videos: [],
                        currentPage: parseInt(page),
                        totalPages: 0,
                        totalVideos: 0
                    },
                    "This channel don't have any videos."
                )
            )
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    videos: channelVideos,
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalVideos / limit),
                    totalVideos
                },
                "Video(s) fetched successfully."
            )
        )

})


export {
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getAllVideos,
    getVideosByChannel
}