import { getApiBase, getToken } from "./auth";

export async function fetchRecs(domain: string) {
  const base = await getApiBase();
  const token = await getToken();
  const r = await fetch(base + "/api/ai/recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ domain })
  });
  if (r.status === 401) throw new Error("AUTH");
  return r.json();
}

export async function discover(name: string) {
  const base = await getApiBase();
  const token = await getToken();
  const r = await fetch(base + "/api/ai/discover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ candidate_membership_name: name })
  });
  if (r.status === 401) throw new Error("AUTH");
  return r.json();
}

