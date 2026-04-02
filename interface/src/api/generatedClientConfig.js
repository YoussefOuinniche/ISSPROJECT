import { setAuthTokenGetter, setBaseUrl } from '../../../Skill-Pulse-1/lib/api-client-react/src/index.ts';
import { getAuthToken } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let configured = false;

export function ensureGeneratedClientConfigured() {
  if (configured) return;
  setBaseUrl(API_BASE_URL);
  setAuthTokenGetter(() => getAuthToken());
  configured = true;
}
