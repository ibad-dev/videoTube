import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  //TODO: create playlist
  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(
      400,
      "Name and Description is required to create playlist"
    );
  }
  try {
    const playlist = await Playlist.create({
      name,
      description,
      owner: req.user._id,
    });

    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Playlist Created Succesfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to create playlist", error.message);
  }
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  if (!userId) {
    throw new ApiError(400, "User id is required");
  }
  const pipeline = [
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "userDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        userDetails: {
          $first: "$userDetails", // Extract the first (and only) element
        },
      },
    },
    {
      $group: {
        _id: "$owner", // Group by `owner` to combine their playlists
        ownerDetails: { $first: "$userDetails" }, // Add `username` and `avatar`
        playlists: {
          $push: {
            _id: "$_id",
            name: "$name",
            description: "$description",
            videos: "$videos",
            createdAt: "$createdAt",
            updatedAt: "$updatedAt",
          },
        },
      },
    },
  ];

  try {
    const allPlaylistOfUser = await Playlist.aggregate(pipeline);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          allPlaylistOfUser,
          "All Playlists Fetched Successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to fetch all playlists ");
  }
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required");
  }
  try {
    const playlist = await Playlist.findById(playlistId);
    return res.status(200).json(200, playlist, "Playlist Feched Successfully");
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to fetch playlist ");
  }
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { videoId, playlistId } = req.params;
  if (!(playlistId && videoId)) {
    throw new ApiError(400, "Playlist and Video Id are required");
  }
  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const user = await User.findById(video.owner.toString());
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }
  try {
    const updatedplaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $addToSet: {
          videos: {
            videoId: videoId,
            videoFile: video.videoFile?.toString(),
            title: video.title,
            channel: user.username,
          },
        },
      },
      { new: true }
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedplaylist,
          "Video added to playlist Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "Error to add video to playlist");
  }
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  if (!(playlistId && videoId)) {
    throw new ApiError(400, "Playlist and Video Id are required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const user = await User.findById(video.owner.toString());
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }
  // Ensure `videos` is defined and check if it's empty
  if (playlist.videos.length === 0) {
    throw new ApiError(400, "No videos in the playlist to delete");
  }

  // Check if the video exists in the playlist
  const videoExists = playlist.videos.some(
    (video) => video.videoId.toString() === videoId
  );

  if (!videoExists) {
    throw new ApiError(404, "Video not found in the playlist");
  }

  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
      $pull: {
        videos: {
          videoId: videoId,
          videoFile: video.videoFile?.toString(),
          title: video.title,
          channel: user.username,
        },
      },
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedPlaylist,
          "Video removed from playlist Successfully"
        )
      );
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "Error to remove video from playlist");
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!Playlist) {
    throw new ApiError(400, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }
  try {
    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
    return res
      .status(200)
      .json(200, deletePlaylist, "Playlist deleted Successfully");
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to delete playlist");
  }
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  if ([name, description].some((field) => field?.trim() === "")) {
    throw new ApiError(
      400,
      "Name and description is required to update a playlist"
    );
  }
  if (!playlistId) {
    throw new ApiError(400, "Playlist id is required it can't be empty");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!Playlist) {
    throw new ApiError(400, "Playlist not found");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to perform this action");
  }
  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      {
        $set: {
          name,
          description,
        },
      },
      { new: true }
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedPlaylist,
          "Playlist Updated Successfully with name and description"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to update playlist ");
  }
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
