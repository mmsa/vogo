export const gs = async <T>(k: string, area: "sync" | "local" = "sync"): Promise<T | undefined> =>
  new Promise(r => chrome.storage[area].get(k, v => r(v[k])));

export const ss = async (k: string, v: any, area: "sync" | "local" = "sync") =>
  new Promise(r => chrome.storage[area].set({ [k]: v }, r));

export const rm = async (k: string, area: "sync" | "local" = "sync") =>
  new Promise(r => chrome.storage[area].remove(k, r));

