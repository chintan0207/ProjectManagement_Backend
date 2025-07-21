/* eslint-disable no-undef */
import { asyncHandler } from "../utils/async-handler.js";
import { ApiResponse } from "../utils/api-response.js";
import { Organization } from "../models/organization.model.js";
import { ApiError } from "../utils/api-error.js";
import { OrgRoleEnum } from "../utils/constant.js";
import { User } from "../models/user.model.js";
import { InviteToken } from "../models/inviteToken.model.js";
import { emailQueue } from "../../queues/emailQueue.js";
import crypto from "crypto";
import mongoose from "mongoose";
import { OrganizationMember } from "../models/organizationMember.model.js";

export const createOrganization = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const { name } = req.validatedData;
    const user = req.user;
    const logo = req.file ? req.file.path : null;

    const existingOrganization = await Organization.findOne({ name, isDeleted: false }).session(
      session,
    );
    if (existingOrganization) {
      throw new ApiError(409, "Organization with this name already exists");
    }

    const [organization] = await Organization.create(
      [
        {
          name,
          logo,
          createdBy: user._id,
        },
      ],
      { session },
    );

    await OrganizationMember.create(
      [
        {
          organizationId: organization._id,
          userId: user._id,
          role: OrgRoleEnum.ORG_ADMIN,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res.status(201).json(new ApiResponse(201, { result: organization }, "Organization created"));
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

export const getMyOrganizations = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  let {
    page = 1,
    limit = 10,
    sortOrder = "desc",
    sortField = "createdAt",
    search = "",
  } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  try {
    const session = await mongoose.startSession();
    session.startTransaction();

    const memberships = await OrganizationMember.find({ userId }).lean();

    if (!memberships.length) {
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            { organizations: [], total: 0, totalPages: 0, page: pageNumber },
            "No organizations found",
          ),
        );
    }

    const orgIds = memberships.map((m) => m.organizationId);
    const orgRolesMap = {};
    memberships.forEach((m) => {
      orgRolesMap[m.organizationId.toString()] = m.role;
    });

    const pipeline = [
      {
        $match: {
          _id: { $in: orgIds },
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdBy",
        },
      },
      {
        $unwind: {
          path: "$createdBy",
          preserveNullAndEmptyArrays: true,
        },
      },
      ...(search.trim()
        ? [
            {
              $match: {
                $or: [
                  { name: { $regex: search, $options: "i" } },
                  { "createdBy.fullname": { $regex: search, $options: "i" } },
                  { "createdBy.email": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $addFields: {
          userRole: {
            $let: {
              vars: {
                orgIdStr: { $toString: "$_id" },
              },
              in: {
                $literal: orgRolesMap,
              },
            },
          },
        },
      },
      {
        $addFields: {
          userRole: {
            $arrayElemAt: [
              {
                $objectToArray: "$userRole",
              },
              {
                $indexOfArray: [
                  { $map: { input: orgIds, as: "org", in: { $toString: "$$org" } } },
                  { $toString: "$_id" },
                ],
              },
            ],
          },
        },
      },
      {
        $project: {
          name: 1,
          logo: 1,
          createdAt: 1,
          "createdBy.fullname": 1,
          "createdBy.email": 1,
          "createdBy.username": 1,
          userRole: "$userRole.v",
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
                  $ceil: { $divide: ["$total", limitNumber] },
                },
              },
            },
          ],
          data: [{ $skip: skip }, { $limit: limitNumber }],
        },
      },
    ];

    const stringSortFields = ["name", "createdBy.fullname", "createdBy.email"];
    const result = stringSortFields.includes(sortField)
      ? await Organization.aggregate(pipeline).collation({ locale: "en", strength: 2 })
      : await Organization.aggregate(pipeline);

    const { metaData = [], data: organizations = [] } = result[0] || {};
    const paginationData = metaData[0] || {
      total: 0,
      page: pageNumber,
      limit: limitNumber,
      totalPages: 0,
    };

    await session.commitTransaction();

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { organizations, ...paginationData },
          organizations.length ? "Organizations fetched successfully" : "No organizations found",
        ),
      );
  } catch (error) {
    await session.abortTransaction();
    console.error("Error fetching organizations:", error);
    return res.status(500).json(new ApiResponse(500, {}, "Failed to fetch organizations"));
  } finally {
    await session.endSession();
  }
});

export const getOrganizationById = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  if (!orgId || !mongoose.Types.ObjectId.isValid(orgId)) {
    throw new ApiError(400, "Valid organization ID is required");
  }

  const organization = await Organization.findOne({ _id: orgId, isDeleted: false }).populate({
    path: "createdBy",
    select: "username email fullname avatar",
  });

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  const members = await OrganizationMember.find({ organizationId: orgId })
    .populate({
      path: "userId",
      select: "username email fullname avatar",
    })
    .select("userId role addedAt");

  const formattedMembers = members.map((member) => ({
    _id: member._id,
    role: member.role,
    addedAt: member.addedAt,
    user: member.userId,
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        result: organization,
        members: formattedMembers,
      },
      "Organization fetched",
    ),
  );
});

export const updateOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { name } = req.body;
  const logo = req.file ? req.file.path : null;

  if (!orgId) {
    throw new ApiError(400, "Organization ID is required");
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (logo) updateData.logo = logo;

  const updatedOrg = await Organization.findOneAndUpdate(
    { _id: orgId, isDeleted: false },
    updateData,
    { new: true },
  );

  if (!updatedOrg) {
    throw new ApiError(404, "Organization not found or deleted");
  }

  res.status(200).json(new ApiResponse(200, updatedOrg, "Organization updated"));
});

export const softDeleteOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  if (!orgId) throw new ApiError(400, "Organization ID is required");

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) throw new ApiError(404, "Organization not found");

    const members = await OrganizationMember.find({ organizationId: orgId });

    const previousMembers = members.map((member) => ({
      userId: member.userId,
      role: member.role,
    }));

    await OrganizationMember.deleteMany({ organizationId: orgId });

    organization.isDeleted = true;
    organization.deletedAt = new Date();
    organization.previousMembers = previousMembers;
    await organization.save();

    res.status(200).json(new ApiResponse(200, {}, "Organization soft-deleted"));
  } catch (error) {
    console.error("Error soft deleting organization:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to soft delete organization"));
  }
});

export const restoreOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  if (!orgId) {
    throw new ApiError(400, "Organization ID is required");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    organization.isDeleted = false;
    organization.deletedAt = undefined;

    // Reassign previous members back to users
    if (organization.previousMembers?.length) {
      const bulkMembers = organization.previousMembers.map((member) => ({
        organizationId: orgId,
        userId: member.userId,
        role: member.role,
      }));

      await OrganizationMember.insertMany(bulkMembers);
      organization.previousMembers = [];
    }

    await organization.save();

    await session.commitTransaction();
    res.status(200).json(new ApiResponse(200, {}, "Organization restored"));
  } catch (error) {
    await session.abortTransaction();
    console.error("Error restoring organization:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to restore organization"));
  } finally {
    await session.endSession();
  }
});

export const deleteOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    throw new ApiError(400, "Organization ID is required");
  }
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const organization = await Organization.findByIdAndDelete(orgId);
    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    await OrganizationMember.deleteMany({ organizationId: orgId });

    res.status(200).json(new ApiResponse(200, {}, "Organization deleted"));
  } catch (error) {
    await session.abortTransaction();
    console.error("Error deleting organization:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to delete organization"));
  } finally {
    await session.endSession();
  }
});

export const sendOrganizationInvite = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { email, role } = req.body;

  const session = await Organization.startSession();

  try {
    session.startTransaction();

    const organization = await Organization.findOne({ _id: orgId, isDeleted: false }).session(
      session,
    );
    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    const user = await User.findOne({ email: email.toLowerCase(), isDeleted: false }).session(
      session,
    );

    if (user) {
      const existingMember = await OrganizationMember.findOne({
        organizationId: orgId,
        userId: user._id,
      }).session(session);

      if (existingMember) {
        throw new ApiError(400, "User is already a member of this organization");
      }
    }

    const token = crypto.randomBytes(32).toString("hex");

    await InviteToken.create(
      [
        {
          email: email.toLowerCase(),
          role,
          token,
          organizationId: orgId,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      ],
      { session },
    );

    await emailQueue.add("sendOrgInviteEmail", {
      type: "organization-invite",
      email,
      subject: "You're invited to join an organization",
      inviteLink: `${process.env.BASE_URL}/join-org/${token}`,
      orgName: organization.name,
    });

    await session.commitTransaction();

    res.status(200).json(new ApiResponse(200, {}, "Organization invite sent successfully"));
  } catch (error) {
    await session.abortTransaction();
    console.error("Invite error:", error);
    throw new ApiError(500, "Failed to send organization invite");
  } finally {
    session.endSession();
  }
});

export const joinOrganizationWithToken = asyncHandler(async (req, res) => {
  const { inviteToken } = req.params;
  const user = req.user;

  if (!inviteToken) {
    throw new ApiError(400, "Invite token is required");
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const tokenDoc = await InviteToken.findOne({
      token: inviteToken,
      isUsed: false,
      isDeleted: false,
      expiresAt: { $gt: new Date() },
    }).session(session);

    if (!tokenDoc) {
      throw new ApiError(400, "Invalid or expired token");
    }

    const existingMember = await OrganizationMember.findOne({
      organizationId: tokenDoc.organizationId,
      userId: user._id,
    }).session(session);

    if (existingMember) {
      throw new ApiError(400, "You are already a member of this organization");
    }

    await OrganizationMember.create(
      [
        {
          organizationId: tokenDoc.organizationId,
          userId: user._id,
          role: tokenDoc.role,
        },
      ],
      { session },
    );

    tokenDoc.isUsed = true;
    tokenDoc.usedBy = user._id;
    await tokenDoc.save({ session });

    await session.commitTransaction();

    res.status(200).json(new ApiResponse(200, {}, "Joined organization successfully"));
  } catch (error) {
    await session.abortTransaction();
    console.error("Error joining organization:", error);
    throw new ApiError(500, "Failed to join organization");
  } finally {
    session.endSession();
  }
});

export const getOrganizationMembers = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  let { page = 1, limit = 10, sortField = "fullname", sortOrder = "asc", search = "" } = req.query;

  const pageNumber = parseInt(page);
  const limitNumber = parseInt(limit);
  const skip = (pageNumber - 1) * limitNumber;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  try {
    if (!mongoose.Types.ObjectId.isValid(orgId)) {
      throw new ApiError(400, "Invalid organization ID");
    }

    const organization = await Organization.findById(orgId);
    if (!organization || organization.isDeleted) {
      throw new ApiError(404, "Organization not found");
    }

    const pipeline = [
      {
        $match: {
          organizationId: new mongoose.Types.ObjectId(orgId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      ...(search.trim()
        ? [
            {
              $match: {
                $or: [
                  { "user.fullname": { $regex: search, $options: "i" } },
                  { "user.email": { $regex: search, $options: "i" } },
                  { "user.username": { $regex: search, $options: "i" } },
                ],
              },
            },
          ]
        : []),
      {
        $project: {
          _id: 1,
          userId: 1,
          role: 1,
          addedAt: 1,
          "user.fullname": 1,
          "user.email": 1,
          "user.username": 1,
          "user.avatar": 1,
        },
      },
      {
        $sort: {
          [`user.${sortField}`]: sortDirection,
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
                  $ceil: { $divide: ["$total", limitNumber] },
                },
              },
            },
          ],
          data: [{ $skip: skip }, { $limit: limitNumber }],
        },
      },
    ];

    const stringSortFields = ["fullname", "email", "username"];
    const result = stringSortFields.includes(sortField)
      ? await OrganizationMember.aggregate(pipeline).collation({ locale: "en", strength: 2 })
      : await OrganizationMember.aggregate(pipeline);

    const { metaData = [], data: members = [] } = result[0] || {};
    const pagination = metaData[0] || {
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
          { result: members, ...pagination },
          members.length ? "Organization members fetched" : "No members found",
        ),
      );
  } catch (error) {
    console.error("Error fetching organization members:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to fetch members"));
  }
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { orgId, userId } = req.params;
  const { role } = req.body;

  if (!orgId || !userId || !role) {
    throw new ApiError(400, "Organization ID, User ID, and role are required");
  }

  if (!mongoose.Types.ObjectId.isValid(orgId) || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid organization ID or user ID");
  }

  if (!Object.values(OrgRoleEnum).includes(role)) {
    throw new ApiError(400, "Invalid role provided");
  }

  const member = await OrganizationMember.findOne({ organizationId: orgId, userId });
  if (!member) {
    throw new ApiError(404, "Member not found in organization");
  }

  member.role = role;
  await member.save();

  res.status(200).json(new ApiResponse(200, { member }, "Member role updated successfully"));
});

export const removeMemberFromOrganization = asyncHandler(async (req, res) => {
  const { orgId, userId } = req.params;

  if (!orgId || !userId) {
    throw new ApiError(400, "Organization ID and User ID are required");
  }

  if (!mongoose.Types.ObjectId.isValid(orgId) || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid organization ID or user ID");
  }

  const member = await OrganizationMember.findOne({ organizationId: orgId, userId });
  if (!member) {
    throw new ApiError(404, "Member not found in organization");
  }

  // Prevent removing the last ORG_ADMIN
  if (member.role === OrgRoleEnum.ORG_ADMIN) {
    const adminCount = await OrganizationMember.countDocuments({
      organizationId: orgId,
      role: OrgRoleEnum.ORG_ADMIN,
    });

    if (adminCount <= 1) {
      throw new ApiError(400, "Cannot remove the last admin of the organization");
    }
  }

  await OrganizationMember.deleteOne({ _id: member._id });

  res.status(200).json(new ApiResponse(200, {}, "Member removed from organization"));
});
