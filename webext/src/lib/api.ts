import { authenticatedFetch } from "./auth";

export async function fetchRecs(domain: string) {
  const r = await authenticatedFetch("/api/ai/recommendations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ domain }),
  });
  if (r.status === 401) throw new Error("AUTH");
  return r.json();
}

export async function discover(name: string) {
  const r = await authenticatedFetch("/api/ai/discover", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ candidate_membership_name: name }),
  });
  if (r.status === 401) throw new Error("AUTH");
  return r.json();
}
