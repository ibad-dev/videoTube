import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params; // Video ID from the route
  const { page = 1, limit = 10 } = req.query; // Pagination parameters

  // Validate videoId
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // Check if the video exists
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Build the aggregation pipeline
  const pipeline = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId), // Match comments for the given video
      },
    },
    {
      $lookup: {
        from: "users", // Reference the "users" collection
        localField: "owner", // Match the `owner` field in the comments collection
        foreignField: "_id", // Match it with the `_id` field in the users collection
        as: "ownerDetails", // Add user details under this field
      },
    },
    { $unwind: "$ownerDetails" },
    // Flatten the `ownerDetails` array
    {
      $project: {
        content: 1, // Include content of the comment
        video: 1, // Include the video ID
        owner: 1, // Include the owner ID
        "ownerDetails.username": 1, // Include only the 'username' from ownerDetails
        "ownerDetails.avatar": 1, // Include only the 'avatar' from ownerDetails
      },
    },
    { $sort: { createdAt: -1 } }, // Sort comments by newest first
  ];

  // Apply pagination with mongoose-aggregate-paginate
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };
  try {
    const result = await Comment.aggregatePaginate(
      Comment.aggregate(pipeline),
      options
    );

    // Send response
    res
      .status(200)
      .json(new ApiResponse(200, result, "Comments retrieved successfully"));
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to fetch comments");
  }
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { content } = req.body;
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required to add comment to video");
  }
  if (content.trim() === "") {
    throw new ApiError(400, "Content can't be empty to add comment");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  try {
    const comment = await Comment.create({
      content,
      video: videoId,
      owner: req.user._id,
    });
    return res
      .status(200)
      .json(
        new ApiResponse(200, comment, "Comment added to video Successfully")
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(400, "Error to add comment on a video");
  }
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // Validate the commentId
  if (!commentId) {
    throw new ApiError(400, "Comment ID is required to update the comment");
  }

  // Validate the content
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content can't be empty to update the comment");
  }

  // Check if the comment exists
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Try to update the comment
  try {
    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $set: { content: content.trim() } },
      { new: true } // Return the updated document
    );

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
      );
  } catch (error) {
    console.error("Error updating comment:", error);
    throw new ApiError(500, "Failed to update the comment");
  }
});
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Validate commentId
  if (!commentId) {
    throw new ApiError(400, "Comment ID is required to delete a comment");
  }

  // Check if the comment exists
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  try {
    // Delete the comment
    const deletedComment = await Comment.findByIdAndDelete(commentId);

    return res
      .status(200)
      .json(
        new ApiResponse(200, deletedComment, "Comment deleted successfully")
      );
  } catch (error) {
    console.error("Error deleting comment:", error);
    throw new ApiError(500, "Failed to delete the comment");
  }
});

export { getVideoComments, addComment, updateComment, deleteComment };
