import { gs, ss, rm } from "./storage";

export const TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const API_KEY = "apiBase";
export const AUTO_OPEN = "autoOpen";
export const USER_ID_KEY = "userId";

export const getToken = () => gs<string>(TOKEN_KEY);
export const getRefreshToken = () => gs<string>(REFRESH_TOKEN_KEY);
export const setToken = (t: string) => ss(TOKEN_KEY, t);
export const clearToken = () => rm(TOKEN_KEY);
export const getApiBase = async () => (await gs<string>(API_KEY)) || "https://app.vogoplus.app";
export const setApiBase = (u: string) => ss(API_KEY, u);

let refreshInFlight: Promise<string | null> | null = null;

export async function setSession(accessToken: string, refreshToken?: string) {
  await ss(TOKEN_KEY, accessToken);
  if (refreshToken) {
    await ss(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearSession() {
  await Promise.all([
    rm(TOKEN_KEY),
    rm(REFRESH_TOKEN_KEY),
    rm(USER_ID_KEY),
  ]);
}

export async function login(email: string, password: string) {
  const base = await getApiBase();
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) throw new Error("Login failed");
  const j = await r.json();
  await setSession(j.access_token, j.refresh_token);
  return j;
}

export async function refreshAccessToken(apiBase?: string): Promise<string | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }

  refreshInFlight = (async () => {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
      await clearSession();
      return null;
    }

    const base = apiBase || (await getApiBase());
    try {
      const response = await fetch(base + "/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        await clearSession();
        return null;
      }

      const data = await response.json();
      await setSession(data.access_token, data.refresh_token);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function withAuthHeader(headers: HeadersInit | undefined, token: string): Headers {
  const merged = new Headers(headers);
  merged.set("Authorization", "Bearer " + token);
  return merged;
}

export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
  apiBase?: string
): Promise<Response> {
  const base = apiBase || (await getApiBase());
  let token = await getToken();
  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const send = (currentToken: string) =>
    fetch(base + path, {
      ...init,
      headers: withAuthHeader(init.headers, currentToken),
    });

  let response = await send(token);
  if (response.status !== 401) {
    return response;
  }

  token = await refreshAccessToken(base);
  if (!token) {
    throw new Error("AUTH_FAILED");
  }

  response = await send(token);
  if (response.status === 401) {
    await clearSession();
    throw new Error("AUTH_FAILED");
  }

  return response;
}
