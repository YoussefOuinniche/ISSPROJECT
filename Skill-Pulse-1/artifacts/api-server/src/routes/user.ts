import { Router, type IRouter } from "express";
import {
  GetUserProfileResponse,
  UpsertUserProfilePutBody,
  UpsertUserProfilePutResponse,
  GetUserDashboardResponse,
  GetUserRecommendationsQueryParams,
  GetUserRecommendationsResponse,
  GetUserSkillGapsQueryParams,
  GetUserSkillGapsResponse,
} from "@workspace/api-zod";

import { proxyLegacy } from "../lib/legacy-api";

const router: IRouter = Router();

router.get("/user/profile", async (req, res) => {
  const upstream = await proxyLegacy(req, "/user/profile", "GET");

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = GetUserProfileResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.put("/user/profile", async (req, res) => {
  const body = UpsertUserProfilePutBody.parse(req.body);
  const upstream = await proxyLegacy(req, "/user/profile", "PUT", body);

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = UpsertUserProfilePutResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.post("/user/profile", async (req, res) => {
  const body = UpsertUserProfilePutBody.parse(req.body);
  const upstream = await proxyLegacy(req, "/user/profile", "POST", body);

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = UpsertUserProfilePutResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.get("/user/dashboard", async (req, res) => {
  const upstream = await proxyLegacy(req, "/user/dashboard", "GET");

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = GetUserDashboardResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.get("/user/recommendations", async (req, res) => {
  const query = GetUserRecommendationsQueryParams.parse(req.query);
  const params = new URLSearchParams();
  if (query.type) params.set("type", query.type);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.offset != null) params.set("offset", String(query.offset));

  const suffix = params.size > 0 ? `?${params.toString()}` : "";
  const upstream = await proxyLegacy(req, `/user/recommendations${suffix}`, "GET");

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = GetUserRecommendationsResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.get("/user/skill-gaps", async (req, res) => {
  const query = GetUserSkillGapsQueryParams.parse(req.query);
  const suffix = query.domain ? `?domain=${encodeURIComponent(query.domain)}` : "";
  const upstream = await proxyLegacy(req, `/user/skill-gaps${suffix}`, "GET");

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = GetUserSkillGapsResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

export default router;
