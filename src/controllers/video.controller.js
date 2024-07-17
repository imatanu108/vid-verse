import { Video } from "../models/video.model";
import { User } from "../models/user.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { uploadOnCloudinary } from "../utils/cloudinary";
import mongoose from "mongoose";


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!title.trim() || !description.trim()) {
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

    if (!videoId.trim()) {
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

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                video,
                "Video found successfully."
            )
        )
})


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId.trim()) {
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

    if (!videoId.trim()) {
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

    if (!videoId.trim()) {
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
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
})

export {
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    getAllVideos
}