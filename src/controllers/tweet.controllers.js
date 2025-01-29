import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;
  if (!content) {
    throw new ApiError(400, "Content is required to create tweet");
  }
  try {
    const tweet = await Tweet.create({
      content,
      owner: req.user._id,
    });
    return res
      .status(200)
      .json(new ApiResponse(200, tweet, "Tweet created successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to create tweet");
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(400, "Userid is required to get tweets");
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
        UserDetails: { $first: "$userDetails" },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $group: {
        _id: "$owner",
        UserDetails: { $first: "$userDetails" },
        tweets: {
          $push: {
            _id: "$_id",
            content: "$content",
          },
        },
      },
    },
  ];
  try {
    const allUserTweets = await Tweet.aggregate(pipeline);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          allUserTweets,
          "All tweets of User Fetched Successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error To Fetch tweets of user");
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { tweetId } = req.params;
  const { content } = req.body;
  if (!(tweetId && content)) {
    throw new ApiError(
      400,
      "Tweet ID and content are required to update tweet"
    );
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "Tweet not found");
  }
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update tweet");
  }
  try {
    const updatedTweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          content,
        },
      },
      { new: true }
    );
    return res
      .status(200)
      .json(new ApiResponse(200, updatedTweet, "Tweet updated Successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to update tweet");
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;
  if (!tweetId) {
    throw new ApiError(400, "Tweet ID is required to delete tweet");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "Tweet not found");
  }
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete tweet");
  }
  try {
    const deletedTweet = await Tweet.findByIdAndDelete(tweetId, { new: true });
    return res
      .status(200)
      .json(new ApiResponse(200, deletedTweet, "Tweet deleted Successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to delete tweet");
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
