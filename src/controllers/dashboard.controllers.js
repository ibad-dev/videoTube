import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscriptions.models.js";
import { User } from "../models/user.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  const userId = req.user._id;
  const video = await Video.find({ owner: userId }).select("views videoFile");
  const videoId = await Video.find({ owner: userId }).select("_id");

  const user = await User.findById(userId);
  const subs = await Subscription.find({ channel: userId });
  const totalLikes = await Like.countDocuments({ video: videoId });

  const [videoViews] = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
      },
    },
  ]);

  const response = {
    "Channel Name": user.username,
    "Channel Avatar": user.avatar,
    "Total Subscribers:": subs.length,
    "Total Published Videos": video.length,
    "Total Video Views": videoViews.totalViews,
    "Total Video Likes": totalLikes,
  };
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        response,
        "All Stats Of A Channel Fetched  Successfully"
      )
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const userId = req.user._id;
  const user = await User.findById(userId);
  const video = await Video.find({ owner: userId }).select(
    "title videoFile thumbnail duration"
  );
  const response = {
    "Channel Name": user.username,
    "Channel Avatar": user.avatar,
    "Total Videos Count": video.length,
    "Published Videos": video,
  };

  return res.status(200).json(
    new ApiResponse(
      200,

      response,

      "All videos fetched successfully"
    )
  );
});

export { getChannelStats, getChannelVideos };
