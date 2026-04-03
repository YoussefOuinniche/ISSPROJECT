import { Router, type IRouter } from "express";
import {
  RegisterAuthBody,
  LoginAuthBody,
  RefreshAuthTokenBody,
  LoginAuthResponse,
  RefreshAuthTokenResponse,
  GetCurrentUserResponse,
  LogoutAuthResponse,
} from "@workspace/api-zod";

import { proxyLegacy } from "../lib/legacy-api";

const router: IRouter = Router();

router.post("/auth/register", async (req, res) => {
  const body = RegisterAuthBody.parse(req.body);
  const upstream = await proxyLegacy(req, "/auth/register", "POST", body);

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = LoginAuthResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.post("/auth/login", async (req, res) => {
  const body = LoginAuthBody.parse(req.body);
  const upstream = await proxyLegacy(req, "/auth/login", "POST", body);

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = LoginAuthResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.post("/auth/refresh-token", async (req, res) => {
  const body = RefreshAuthTokenBody.parse(req.body);
  const upstream = await proxyLegacy(req, "/auth/refresh-token", "POST", body);

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = RefreshAuthTokenResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.get("/auth/me", async (req, res) => {
  const upstream = await proxyLegacy(req, "/auth/me", "GET");

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = GetCurrentUserResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

router.post("/auth/logout", async (req, res) => {
  const upstream = await proxyLegacy(req, "/auth/logout", "POST");

  if (upstream.status >= 200 && upstream.status < 300) {
    const parsed = LogoutAuthResponse.parse(upstream.data);
    return res.status(upstream.status).json(parsed);
  }

  return res.status(upstream.status).json(upstream.data);
});

export default router;
