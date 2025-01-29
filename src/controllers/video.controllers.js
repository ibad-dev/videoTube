import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import fs from "fs";
import { getVideoDuration } from "../utils/VideoDuration.js";
import { pipeline } from "stream";
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = -1,
    userId,
  } = req.query;

  //TODO: get all videos based on query, sort, pagination

  const pipeline = [
    {
      $match: {
        isPublished: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$ownerDetails",
        },
      },
    },
    {
      $project:{
        ownerDetails:0
      }
    },
    {
      $sort: {
        [sortBy]: parseInt(sortType),
      },
    },
    {
      $skip: (parseInt(page) - 1) * parseInt(limit),
    },
    {
      $limit: parseInt(limit),
    },
  ].filter(Boolean);

  const videos = await Video.aggregate(pipeline);
  const totalVideos = await Video.countDocuments({ isPublished: true });
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalVideos / parseInt(limit)),
        totalVideos,
      },
      "Videos Fetched Successfully"
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(401, "Title and description are required");
  }
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!(videoLocalPath && thumbnailLocalPath)) {
    throw new ApiError(400, "Thumbnail and video are required");
  }
  const duration = await getVideoDuration(videoLocalPath);

  let video;
  try {
    video = await uploadOnCloudinary(videoLocalPath);
    console.log("Video Uploaded successfully");
  } catch (error) {
    throw new ApiError(400, "Error while uploading video");
  }
  let thumbnail;
  try {
    thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    console.log("thumbnail Uploaded successfully");
  } catch (error) {
    throw new ApiError(400, "Error while uploading thumbnail");
  }
  try {
    const createdVideo = await Video.create({
      title: title,
      description: description,
      videoFile: video.url,
      thumbnail: thumbnail.url,
      duration: duration,
      isPublished:true,
      owner: req.user?._id,
    });
    if (fs.existsSync(videoLocalPath)) fs.unlinkSync(videoLocalPath);
    if (fs.existsSync(thumbnailLocalPath)) fs.unlinkSync(thumbnailLocalPath);
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          createdVideo,
          "Video Published on channel Successfully"
        )
      );
  } catch (error) {
    console.error(error);
    throw new ApiError(402, "Error while pulishing video");
  }
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  if (!isValidObjectId(videoId)) {
    return next(new ApiError(400, "invalid video id"));
  }
  const vdieo = await Video.updateOne({ _id: videoId }, { $inc: { views: 1 } });
  const getVideo = await Video.findById(videoId);
  if (!getVideo) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, getVideo, "Video Fetched through Id successfully")
    );
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video ID Not found !!!!");
  }
  const video = await Video.findById(videoId);
  const { title, description } = req.body;
  if (!(title && description)) {
    throw new ApiError(400, "Title and description are required");
  }
  try {
    const oldThumbnail = video.thumbnail.split("/").pop().split(".")[0];
    await deleteFromCloudinary(oldThumbnail);
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "Error while deleting old thumbnail");
  }
  const thumbnailLocalPath = req.file?.path;
  const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!newThumbnail.url) {
    throw new ApiError(401, "Something went wrong while finding thumbnail");
  }
  try {
    const updatedVideo = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
          thumbnail: newThumbnail.url,
        },
      },
      { new: true }
    ).select("-isPublished -videoFile -duration -views -owner");
    return res.status(200).json(200, "Video Details Editted Successfully");
  } catch (error) {
    console.log(error);
    throw new ApiError(400, "Error to edit details of video");
  }
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  const video = Video.findById(videoId);
  if (!videoId) {
    throw new ApiError(400, "video not found");
  }
  if (req.user?._id.toString() !== video.owner.toString()) {
    throw new ApiError(400, "You don't have permission to delete a video");
  }

  //Deleting video and thumbnail from cloudinary before removing it from database
  const videoPublicId = video.videoFile.split("/").pop().split(".")[0];
  const thumbnailPublicId = video.thumbnail.split("/").pop().split(".")[0];
  await deleteFromCloudinary(videoPublicId);
  await deleteFromCloudinary(thumbnailPublicId);

  const deletedVideo = await Video.findByIdAndDelete(videoId);
  if (!deleteVideo) {
    throw new ApiError(400, "video to be delete not exist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Video Deleted Successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!videoId) {
    throw new ApiError(400, "Video Id not found");
  }
  const video = Video.findById(videoId);
  if (!video) {
    throw new ApiError(400, "Video not found");
  }
  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });
  return res.status(200).json(200, "Video Publish status updated successfully");
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};






