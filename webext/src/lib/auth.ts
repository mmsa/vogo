import { gs, ss, rm } from "./storage";

export const TOKEN_KEY = "accessToken";
export const API_KEY = "apiBase";
export const AUTO_OPEN = "autoOpen";

export const getToken = () => gs<string>(TOKEN_KEY);
export const setToken = (t: string) => ss(TOKEN_KEY, t);
export const clearToken = () => rm(TOKEN_KEY);
export const getApiBase = async () => (await gs<string>(API_KEY)) || "http://localhost:8000";
export const setApiBase = (u: string) => ss(API_KEY, u);

export async function login(email: string, password: string) {
  const base = await getApiBase();
  const r = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!r.ok) throw new Error("Login failed");
  const j = await r.json();
  await setToken(j.access_token);
  return j;
}

