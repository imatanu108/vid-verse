import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";


const createPlaylist = asyncHandler(async (req, res) => {

    const { name, description = "", isPublic = true } = req.body

    if (!name || !name.trim()) {
        throw new ApiError(400, "Name is required!")
    }

    const playlist = await Playlist.create({
        name,
        description,
        isPublic,
        owner: req.user._id
    })

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while creating playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Playlist is created successfully."
            )
        )
})


const updatePlaylist = asyncHandler(async (req, res) => {

    const { name, description, isPublic } = req.body
    const { playlistId } = req.params

    if (!playlistId) {
        throw new ApiError(400, "Playlist Id is missing.")
    }

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id format.")
    }

    if (!name || !name.trim()) {
        throw new ApiError(400, "Name cannot be empty.")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while fetching playlist.")
    }

    // Check if the current user is the owner of the playlist
    if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to update this playlist.");
    }

    // Update the playlist properties
    if (name !== playlist.name) {
        playlist.name = name
    }

    if (description && description.trim() !== "") {
        playlist.description = description
    }

    // updating isPublic status only if its modified
    if (typeof isPublic === "boolean") {
        playlist.isPublic = isPublic;
    }

    try {
        await playlist.save({ validateBeforeSave: false })
    } catch (error) {
        throw new ApiError(400, "Update Error: " + error.message)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Playlist updated successfully."
            )
        )
})


const deletePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!playlistId) {
        throw new ApiError(400, "Playlist Id is missing.")
    }

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id format.")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while fetching Playlist details.")
    }

    // Check if the current user is the owner of the playlist
    if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to delete this playlist.");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

    if (!deletePlaylist) {
        throw new ApiError(400, "Something went wrong while deleting the Playlist.")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                deletedPlaylist,
                "Playlist deleted successfully."
            )
        )
})


const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!playlistId) {
        throw new ApiError(400, "Playlist Id is missing.")
    }

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id format.")
    }

    if (!videoId) {
        throw new ApiError(400, "Video Id is missing.")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id format.")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Something went wrong while fetching playlist.")
    }

    // Check if the current user is the owner of the playlist
    if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to add video in this playlist.");
    }

    // checking if the video is already present in the playlist
    const hasVideo = playlist.videos.includes(videoId)

    if (hasVideo) {
        throw new ApiError(400, "This video is already added to the playlist.")
    }

    playlist.videos.push(videoId)

    try {
        await playlist.save({ validateBeforeSave: false })
    } catch (error) {
        throw new ApiError(400, "Update Error: " + error.message)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Video added in the playlist successfully."
            )
        )
})


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!playlistId) {
        throw new ApiError(400, "Playlist Id is missing.")
    }

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id format.")
    }

    if (!videoId) {
        throw new ApiError(400, "Video Id is missing.")
    }

    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video Id format.")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(400, "Playlist not found.")
    }

    // Check if the current user is the owner of the playlist
    if (!playlist.owner.equals(req.user._id)) {
        throw new ApiError(403, "Sorry! You don't have the authority to modify in this playlist.");
    }

    // const hasVideo = playlist.videos.includes(videoId)
    // if (!hasVideo) {
    //     throw new ApiError(400, "The video is not available in the playlist.")
    // }

    // // deleting the video from the playlist
    // const filteredPlaylist = playlist.videos.filter((video) => (
    //     video.toString() !== videoId
    // ))

    // playlist.videos = filteredPlaylist

    const videoIndex = playlist.videos.indexOf(videoId);

    if (videoIndex === -1) {
        throw new ApiError(400, "The video is not available in the playlist.");
    }

    // Remove the video from the playlist
    playlist.videos.splice(videoIndex, 1);

    try {
        await playlist.save({ validateBeforeSave: false })
    } catch (error) {
        throw new ApiError(400, "Update Error: " + error.message)
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Video removed from the playlist successfully."
            )
        )
})


const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params

    if (!userId) {
        throw new ApiError(400, "User Id is missing.")
    }

    if (!mongoose.isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user Id format.")
    }

    const userObjectId = new mongoose.Types.ObjectId(String(userId));

    let usersPlaylist;

    // if userId and req.user._id is same give all the playlists, otherwise only public playlists
    if (userObjectId.equals(req.user._id)) {
        usersPlaylist = await Playlist.aggregate([
            {
                $match: {
                    owner: userObjectId
                }
            }
        ])
    } else {
        usersPlaylist = await Playlist.aggregate([
            {
                $match: {
                    owner: userObjectId,
                    isPublic: true
                }
            }
        ])
    }

    // Check if playlists are found
    if (!usersPlaylist || usersPlaylist.length === 0) {
        throw new ApiError(404, "No playlists found.");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                usersPlaylist,
                "User playlists found successfully."
            )
        )
})


const getPlaylistById = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!playlistId) {
        throw new ApiError(400, "Playlist Id is missing.")
    }

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid playlist Id format.")
    }

    let playlist;

    try {
        playlist = await Playlist.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(String(playlistId))
                }
            },
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
                $lookup: {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
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
                                owner: {
                                    $arrayElemAt: ["$owner", 0]
                                }
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    owner: {
                        $arrayElemAt: ["$owner", 0]
                    }
                }
            }
        ])
    } catch (error) {
        throw new ApiError(500, "Aggregation Error: " + error.message)
    }

    if (!playlist || playlist.length === 0) {
        throw new ApiError(400, "Playlist not found.")
    }

    // checking is the playlist public or private
    const playlistIsPublic = playlist[0].isPublic

    if (playlistIsPublic) {
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    playlist[0],
                    "Playlist found successfully."
                )
            )
    } else {
        if (!playlist[0].owner.equals(req.user._id)) {
            throw new ApiError(403, "Sorry, you don't have the authority to access this playlist.")
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    playlist[0],
                    "Playlist found successfully."
                )
            )
    }

})


export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists
}