import mongoose from "mongoose";
import { asyncHandler } from "../utils/async-handler.js";
import { ApiError } from "../utils/api-error.js";
import { ProjectNote } from "../models/projectNote.model.js";
import { logActivity } from "../utils/log-activity.js";
import { ApiResponse } from "../utils/api-response.js";

export const createProjectNote = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { title, content } = req.body;
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  if (!title || title.trim() === "") {
    throw new ApiError(400, "Note title is required");
  }

  const note = await ProjectNote.create({
    projectId,
    title: title.trim(),
    content: content || "",
    createdBy: userId,
  });

  await logActivity({
    userId,
    action: "create_project_note",
    projectId,
    metadata: { title: note.title },
  });

  res.status(201).json(new ApiResponse(201, { result: note }, "Project note created"));
});

export const getProjectNotes = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  let { page, limit, sortOrder = "desc", sortField = "createdAt", search = "" } = req.query;

  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new ApiError(400, "Invalid project ID");
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const usePagination = page !== undefined && limit !== undefined;
  const pageNumber = usePagination ? parseInt(page) : 1;
  const limitNumber = usePagination ? parseInt(limit) : 0;
  const skip = (pageNumber - 1) * limitNumber;

  const matchStage = {
    projectId: new mongoose.Types.ObjectId(projectId),
    isDeleted: false,
    ...(search.trim() && {
      title: { $regex: search, $options: "i" },
    }),
  };

  const pipeline = [
    { $match: matchStage },
    {
      $lookup: {
        from: "users",
        localField: "createdBy",
        foreignField: "_id",
        as: "createdByUser",
      },
    },
    {
      $unwind: {
        path: "$createdByUser",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        title: 1,
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        "createdByUser.fullname": 1,
        "createdByUser.email": 1,
      },
    },
    {
      $sort: {
        [sortField]: sortDirection,
      },
    },
    {
      $facet: {
        metaData: [
          { $count: "total" },
          {
            $addFields: {
              page: pageNumber,
              limit: limitNumber,
              totalPages: {
                $ceil: { $divide: ["$total", limitNumber || 1] },
              },
            },
          },
        ],
        data: usePagination ? [{ $skip: skip }, { $limit: limitNumber }] : [],
      },
    },
  ];

  const result = await ProjectNote.aggregate(pipeline);

  const { metaData = [], data = [] } = result[0] || {};
  const paginationData = metaData[0] || {
    total: 0,
    page: pageNumber,
    limit: limitNumber,
    totalPages: 0,
  };

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { notes: data, ...paginationData },
        data.length ? "Project notes fetched" : "No notes found",
      ),
    );
});

export const getProjectNoteById = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    throw new ApiError(400, "Invalid note ID");
  }

  const note = await ProjectNote.findOne({ _id: noteId, isDeleted: false }).populate(
    "createdBy",
    "fullname email",
  );

  if (!note) {
    throw new ApiError(404, "Project note not found");
  }

  res.status(200).json(new ApiResponse(200, { result: note }, "Project note fetched"));
});

export const updateProjectNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const { title, content } = req.body;

  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    throw new ApiError(400, "Invalid note ID");
  }

  const note = await ProjectNote.findOne({ _id: noteId, isDeleted: false });
  if (!note) {
    throw new ApiError(404, "Note not found or already deleted");
  }

  if (title !== undefined) note.title = title.trim();
  if (content !== undefined) note.content = content;

  await note.save();

  await logActivity({
    userId: req.user._id,
    action: "update_project_note",
    projectId: note.projectId,
    metadata: { title: note.title },
  });

  res.status(200).json(new ApiResponse(200, { result: note }, "Project note updated"));
});

export const softDeleteProjectNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    throw new ApiError(400, "Invalid note ID");
  }

  const note = await ProjectNote.findOneAndUpdate(
    { _id: noteId, isDeleted: false },
    { isDeleted: true, deletedAt: new Date() },
    { new: true },
  );

  if (!note) {
    throw new ApiError(404, "Note not found or already deleted");
  }

  await logActivity({
    userId: req.user._id,
    action: "delete_project_note",
    projectId: note.projectId,
    metadata: { title: note.title },
  });

  res.status(200).json(new ApiResponse(200, {}, "Project note deleted"));
});

export const restoreProjectNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(noteId)) {
    throw new ApiError(400, "Invalid note ID");
  }

  const note = await ProjectNote.findOneAndUpdate(
    { _id: noteId, isDeleted: true },
    { isDeleted: false, deletedAt: null },
    { new: true },
  );

  if (!note) {
    throw new ApiError(404, "Note not found or already restored");
  }

  await logActivity({
    userId: req.user._id,
    action: "restore_project_note",
    projectId: note.projectId,
    metadata: { title: note.title },
  });

  res.status(200).json(new ApiResponse(200, {}, "Project note restored"));
});

export const getDeletedProjectNotes = asyncHandler(async (req, res) => {
  const notes = await ProjectNote.find({ isDeleted: true }).sort({ deletedAt: -1 });

  res.status(200).json(new ApiResponse(200, { result: notes }, "Deleted project notes fetched"));
});
