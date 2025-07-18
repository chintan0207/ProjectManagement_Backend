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

export const createOrganization = asyncHandler(async (req, res) => {
  const { name } = req.validatedData;
  const user = req.user;
  const logo = req.file ? req.file.path : null;

  const existingOrganization = await Organization.findOne({ name, isDeleted: false });
  if (existingOrganization) {
    throw new ApiError(409, "Organization with this name already exists");
  }

  const organization = await Organization.create({
    name,
    logo,
    createdBy: user._id,
  });

  // Update user doc to add org membership
  await User.findByIdAndUpdate(
    user._id,
    {
      $push: {
        organizations: {
          organizationId: organization._id,
          role: OrgRoleEnum.ORG_ADMIN,
        },
      },
    },
    { new: true },
  );

  res.status(201).json(new ApiResponse(201, { result: organization }, "Organization created"));
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
    // Step 1: Get user's organizations with roles
    const user = await User.findById(userId).lean();
    const orgRolesMap = {};
    const orgIds = user.organizations?.map((org) => {
      orgRolesMap[org.organizationId] = org.role;
      return org.organizationId;
    });
    console.log("orgRolesMap", orgRolesMap);
    console.log("orgIds", orgIds);

    if (!orgIds?.length) {
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

    // Step 2: Build aggregation pipeline
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
                $literal: orgRolesMap, // inject user role map into aggregation
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

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { organizations, ...paginationData },
          organizations.length ? "Organizations fetched successfully" : "No organizations found",
        ),
      );
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to fetch organizations"));
  }
});

export const getOrganizationById = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    throw new ApiError(400, "Organization ID is required");
  }

  const [organization] = await Organization.find({ _id: orgId, isDeleted: false }).populate({
    path: "createdBy",
    select: "username email fullName avatar",
  });

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  res.status(200).json(new ApiResponse(200, { result: organization }, "Organization fetched"));
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

    const users = await User.find({ "organizations.organizationId": orgId });

    // Build previousMembers array
    const previousMembers = [];
    for (const user of users) {
      const orgInfo = user.organizations.find((org) => org.organizationId.equals(orgId));
      if (orgInfo) {
        previousMembers.push({
          userId: user._id,
          role: orgInfo.role,
        });
      }
    }

    // Remove org from all users
    await User.updateMany(
      { "organizations.organizationId": orgId },
      { $pull: { organizations: { organizationId: orgId } } },
    );

    // soft deleted & save previous members
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

  try {
    const organization = await Organization.findById(orgId);
    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    organization.isDeleted = false;
    organization.deletedAt = undefined;

    // Reassign previous members back to users
    if (organization.previousMembers?.length) {
      for (const member of organization.previousMembers) {
        await User.updateOne(
          { _id: member.userId },
          {
            $addToSet: {
              organizations: {
                organizationId: orgId,
                role: member.role,
              },
            },
          },
        );
      }

      organization.previousMembers = [];
    }

    await organization.save();

    res.status(200).json(new ApiResponse(200, {}, "Organization restored"));
  } catch (error) {
    console.error("Error restoring organization:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to restore organization"));
  }
});

export const deleteOrganization = asyncHandler(async (req, res) => {
  const { orgId } = req.params;

  if (!orgId) {
    throw new ApiError(400, "Organization ID is required");
  }

  const organization = await Organization.findByIdAndDelete(orgId);
  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  await User.updateMany(
    { "organizations.organizationId": orgId },
    {
      $pull: {
        organizations: { organizationId: orgId },
      },
    },
  );

  // 3. (Optional) Remove related documents:

  res.status(200).json(new ApiResponse(200, {}, "Organization deleted"));
});

export const sendOrganizationInvite = asyncHandler(async (req, res) => {
  const { orgId } = req.params;
  const { email, role } = req.body;

  const user = await User.findOne({ email, isDeleted: false });
  const org = await Organization.findOne({ _id: orgId, isDeleted: false });

  if (user) {
    if (user.organizations.find((org) => org.organizationId.equals(orgId))) {
      throw new ApiError(400, "User already in organization");
    }
  }

  const token = crypto.randomBytes(32).toString("hex");

  const inviteToken = await InviteToken.create({
    email: email.toLowerCase(),
    role,
    token,
    organizationId: orgId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  });

  console.log("inviteToken", inviteToken);

  console.log(`${process.env.BASE_URL}/join-org/${token}`);
  await emailQueue.add("sendOrgInviteEmail", {
    type: "organization-invite",
    email,
    subject: "You're invited to join an organization",
    inviteLink: `${process.env.BASE_URL}/join-org/${token}`,
    orgName: org.name,
  });

  res.status(200).json(new ApiResponse(200, {}, "Invite sent"));
});

export const joinOrganizationWithToken = asyncHandler(async (req, res) => {
  const { inviteToken } = req.params;
  const user = req.user;

  if (!inviteToken) {
    throw new ApiError(400, "Invite token is required");
  }

  const tokenDoc = await InviteToken.findOne({
    token: inviteToken,
    isUsed: false,
    isDeleted: false,
    expiresAt: { $gt: new Date() },
  });

  if (!tokenDoc) {
    throw new ApiError(400, "Invalid or expired token");
  }

  try {
    await User.findByIdAndUpdate(user._id, {
      $addToSet: {
        organizations: {
          organizationId: tokenDoc.organizationId,
          role: tokenDoc.role,
        },
      },
    });

    tokenDoc.isUsed = true;
    tokenDoc.usedBy = user._id;
    await tokenDoc.save();

    res.status(200).json(new ApiResponse(200, {}, "Joined organization successfully"));
  } catch (error) {
    console.error("Error joining organization:", error);
    res.status(500).json(new ApiResponse(500, {}, "Failed to join organization"));
  }
});

export const getOrganizationMembers = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Organization members"));
});

// Change role of a specific member
export const updateMemberRole = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Member role updated"));
});

// Remove a member from the organization
export const removeMemberFromOrganization = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, {}, "Member removed"));
});

// View activity logs for the organization
export const getOrganizationActivityLogs = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Organization activity logs"));
});

// List all projects under the organization
export const getOrganizationProjects = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, [], "Organization projects"));
});
