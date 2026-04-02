import {
  getCurrentUser,
  loginAuth,
  logoutAuth,
  refreshAuthToken,
} from '../../../Skill-Pulse-1/lib/api-client-react/src/index.ts';
import {
  GetCurrentUserResponse,
  LoginAuthBody,
  LoginAuthResponse,
  LogoutAuthResponse,
  RefreshAuthTokenBody,
  RefreshAuthTokenResponse,
} from '../../../Skill-Pulse-1/lib/api-zod/src/index.ts';
import { ensureGeneratedClientConfigured } from './generatedClientConfig';

ensureGeneratedClientConfigured();

export async function loginAdmin(payload) {
  const request = LoginAuthBody.parse(payload);
  const response = await loginAuth(request);
  return LoginAuthResponse.parse(response);
}

export async function getCurrentSessionUser() {
  const response = await getCurrentUser();
  return GetCurrentUserResponse.parse(response);
}

export async function refreshSessionToken(refreshToken) {
  const request = RefreshAuthTokenBody.parse({ refreshToken });
  const response = await refreshAuthToken(request);
  return RefreshAuthTokenResponse.parse(response);
}

export async function logoutSession() {
  const response = await logoutAuth();
  return LogoutAuthResponse.parse(response);
}
