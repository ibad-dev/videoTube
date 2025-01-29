import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscriptions.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
const toggleSubscription = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  const userId = req.user._id;

  if (!subscriberId) {
    throw new ApiError(400, "Channel ID is required to subscribe to a channel");
  }

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  const existingSub = await Subscription.findOne({
    channel: subscriberId,
    subscriber: userId,
  });

  try {
    if (existingSub) {
      await Subscription.findByIdAndDelete(existingSub._id);
      return res.status(200).json({
        status: 200,
        data: null,
        message: "Unsubscribed successfully",
      });
    } else {
      const newSub = await Subscription.create({
        subscriber: userId,
        channel: subscriberId,
      });
      return res.status(200).json({
        status: 200,
        data: newSub,
        message: "Subscribed successfully",
      });
    }
  } catch (error) {
    console.error(error);
    throw new ApiError(500, "Failed to toggle subscription");
  }
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  // Validate channelId
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }

  // Step 1: Check if the channel exists
  const channel = await User.findById(channelId).select("username avatar");
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Step 2: Aggregation to find subscribers and count them
  const subscribers = await Subscription.aggregate([
    // Match subscriptions for the given channel
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    // Join with the User collection to get subscriber details
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriberDetails",
      },
    },
    // Unwind the subscriber details to access username and avatar
    { $unwind: "$subscriberDetails" },
    // Reshape the response to include required fields
    {
      $project: {
        _id: 0,
        username: "$subscriberDetails.username",
        avatar: "$subscriberDetails.avatar",
      },
    },
  ]);

  // Step 3: Get the total subscriber count
  const subscriberCount = subscribers.length;

  // Step 4: Structure the final response
  const response = {
    channel: {
      username: channel.username,
      avatar: channel.avatar,
      subscriberCount, // Add subscriber count
    },
    subscribers: subscribers,
  };

  // Step 5: Return the response
  return res.status(200).json(new ApiResponse(200, response, "Subscribers fetched successfully"));
});

// controller to return channel list to which user has subscribed
const getUserSubscriptions = asyncHandler(async (req, res) => {
  const { channelId } = req.params; // Get channel ID from route params

  // Validate channelId
  if (!channelId) {
    throw new ApiError(400, "Channel ID is required");
  }

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  // Find the channel (user) by ID to get its name and avatar
  const channel = await User.findById(channelId).select("username avatar");


  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }

  // Find all channels this user has subscribed to
  const subscriptions = await Subscription.find({ subscriber: channelId })
    .populate({
      path: "channel", // Get the subscribed channels' data
      select: "username avatar",
    });

  // Format the response to include the subscribed channels' username & avatar
  const subscribedChannels = subscriptions.map((sub) => ({
    username: sub.channel.username,
    avatar: sub.channel.avatar
  }));

  // Send response
  return res.status(200).json({
    status: 200,
    data: {
      channel: {
        username: channel.username,
        avatar: channel.avatar,
      },
      subscriptions: subscribedChannels,
    },
    message: "Subscribed channels fetched successfully",
  });
});










export { toggleSubscription, getUserChannelSubscribers, getUserSubscriptions };
