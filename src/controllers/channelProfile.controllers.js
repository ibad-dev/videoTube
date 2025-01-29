import mongoose, { mongo } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Subscription } from "../models/subscriptions.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.models.js";
const getChannelProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Channel ID from URL
  const { filter } = req.query; // Sorting filter: 'popular', 'latest', 'oldest'

  // Get user channel info
  const user = await User.findById(userId).select("username avatar coverImage");
  if (!user) {
    throw new ApiError(404, "Channel not found");
  }

  // Define sorting criteria
  let sortCriteria = {};
  if (filter === "popular") {
    sortCriteria = { views: -1 }; // Most viewed first
  } else if (filter === "latest") {
    sortCriteria = { createdAt: -1 }; // Newest first
  } else if (filter === "oldest") {
    sortCriteria = { createdAt: 1 }; // Oldest first
  }

  // Get all published videos sorted by the selected filter
  const videos = await Video.find({ owner: userId, isPublished: true })
    .select("title videoFile thumbnail views createdAt")
    .sort(sortCriteria);

  // Get all playlists created by the user
  const playlists = await Playlist.find({ owner: userId }).select(
    "name videos"
  );
  const subscriberCount = await Subscription.countDocuments({
    channel: userId,
  });
  
  // Response format
  const response = {
    "Channel Name": user.username,
    "Channel Banner": user.coverImage,
    "Channel Avatar": user.avatar,
    Subscribers: subscriberCount,
    Playlists: playlists,
    "Published Videos": videos,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, response, "Channel profile fetched successfully")
    );
});
export { getChannelProfile };
