import { Request } from "express";
import mongoose from "mongoose";
import Company from "../models/Company";
import SportelloLavoro from "../models/sportello";
import User from "../models/User";

export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getEffectiveUserId = (req: Request) => {
  const role = req.user?.role;
  if (role === "admin" || role === "super_admin") {
    const userId = req.query.userId as string | undefined;
    return userId || undefined;
  }
  return req.user?._id?.toString();
};

export const getSportelloScopedCompanyIds = async (userId: mongoose.Types.ObjectId | string) => {
  const userDoc = await User.findById(userId)
    .select("organization firstName lastName username")
    .lean<{ organization?: string; firstName?: string; lastName?: string; username?: string }>();

  const sportelloDoc = await SportelloLavoro.findOne({
    user: userId,
    isActive: true,
  })
    .select("_id businessName agentName")
    .lean<{ _id: mongoose.Types.ObjectId; businessName?: string; agentName?: string }>();

  const nameCandidates = [
    sportelloDoc?.businessName,
    sportelloDoc?.agentName,
    userDoc?.organization,
    `${userDoc?.firstName || ""} ${userDoc?.lastName || ""}`.trim(),
    userDoc?.username,
  ]
    .map((v) => String(v || "").trim())
    .filter(Boolean);

  const nameMatchers = nameCandidates.flatMap((value) => {
    const regex = new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, "i");
    return [
      { "contactInfo.laborConsultant": regex },
      { "contactInfo.laborConsultant.businessName": regex },
      { "contactInfo.laborConsultant.agentName": regex },
    ];
  });

  const companies = await Company.find({
    $or: [
      ...(sportelloDoc?._id ? [{ "contactInfo.laborConsultantId": sportelloDoc._id }] : []),
      ...nameMatchers,
    ],
  })
    .select("_id")
    .lean<Array<{ _id: mongoose.Types.ObjectId }>>();

  return companies.map((c: { _id: mongoose.Types.ObjectId }) => c._id);
};

export const getResponsabileScope = async (userId: mongoose.Types.ObjectId | string) => {
  const responsabileObjectId = new mongoose.Types.ObjectId(userId);
  const responsabileDoc = await User.findById(userId)
    .select("organization firstName lastName username")
    .lean<{ organization?: string; firstName?: string; lastName?: string; username?: string }>();

  const responsabileNames: string[] = [];
  const org = responsabileDoc?.organization?.trim();
  if (org) responsabileNames.push(org);
  const full = `${responsabileDoc?.firstName || ""} ${responsabileDoc?.lastName || ""}`.trim();
  if (full) responsabileNames.push(full);
  const username = responsabileDoc?.username?.trim();
  if (username) responsabileNames.push(username);

  const nameMatchers = responsabileNames.map((value) => ({
    "companyDoc.contractDetails.territorialManager": new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, "i"),
  }));

  const responsabileMatch = {
    $or: [{ "companyDoc.user": responsabileObjectId }, ...nameMatchers],
  };

  const companyNameMatchers = responsabileNames.map((value) => ({
    "contractDetails.territorialManager": new RegExp(`^\\s*${escapeRegex(value)}\\s*$`, "i"),
  }));

  const companies = await Company.find({
    $or: [{ user: responsabileObjectId }, ...companyNameMatchers],
  })
    .select("_id")
    .lean<Array<{ _id: mongoose.Types.ObjectId }>>();

  const responsabileCompanyIds = companies.map((c: { _id: mongoose.Types.ObjectId }) => c._id);

  return {
    responsabileObjectId,
    responsabileNames,
    responsabileMatch,
    responsabileCompanyIds,
  };
};
