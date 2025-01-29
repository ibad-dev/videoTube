import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;
  //TODO: toggle like on video
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  try {
    const existedLike = await Like.findOne({ video: videoId, likedBy: userId });
    if (existedLike) {
      await Like.findByIdAndDelete(existedLike._id);
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Like removed successfully"));
    } else {
      const newLike = await Like.create({
        video: videoId,
        likedBy: userId,
      });
      return res
        .status(200)
        .json(new ApiResponse(200, newLike, "Like added successfully"));
    }
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to toggle video like");
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;
  //TODO: toggle like on comment
  if (!commentId) {
    throw new ApiError(400, "commentId is required to like comment");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(400, "Comment not found");
  }
  try {
    const existedLike = await Like.findOne({
      comment: commentId,
      likedBy: userId,
    });

    if (existedLike) {
      await Like.findByIdAndDelete(existedLike._id);
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Like removed successfully"));
    } else {
      const newLike = await Like.create({
        comment: commentId,
        likedBy: userId,
      });
      return res
        .status(200)
        .json(new ApiResponse(200, newLike, "Like added successfully"));
    }
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to toggle comment like");
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  const userId = req.user._id;
  //TODO: toggle like on video
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "tweet not found");
  }
  try {
    const existedLike = await Like.findOne({ tweet: tweetId, likedBy: userId });
    if (existedLike) {
      await Like.findByIdAndDelete(existedLike._id);
      return res
        .status(200)
        .json(new ApiResponse(200, null, "Like removed successfully"));
    } else {
      const newLike = await Like.create({
        tweet: tweetId,
        likedBy: userId,
      });
      return res
        .status(200)
        .json(new ApiResponse(200, newLike, "Like added successfully"));
    }
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to toggle tweet like");
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id; // Logged-in user

  const pipeline = [
    // Step 1: Filter likes by the logged-in user
    {
      $match: { likedBy: new mongoose.Types.ObjectId(userId) },
    },
    // Step 2: Group by video IDs to count likes (optional if needed)
    {
      $group: {
        _id: "$video",
        likeCount: { $sum: 1 },
      },
    },
    // Step 3: Lookup video details from the Video collection
    {
      $lookup: {
        from: "videos", // The name of the Video collection in your database
        localField: "_id", // The grouped video ID
        foreignField: "_id", // The video ID in the Video collection
        as: "videoDetails",
      },
    },
    // Step 4: Unwind the video details to make it a flat object
    {
      $unwind: "$videoDetails",
    },
    // Step 5: Project only the fields you want in the response
    {
      $project: {
        _id: 0,
        videoId: "$_id",
        likeCount: 1,
        videoDetails: {
          title: 1,
          description: 1,
          thumbnail: 1,
        },
      },
    },
  ];

  try {
    const allLikedVideos = await Like.aggregate(pipeline);

    return res
      .status(200)
      .json(
        new ApiResponse(200, allLikedVideos, "Liked videos fetched successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error fetching liked videos");
  }
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
