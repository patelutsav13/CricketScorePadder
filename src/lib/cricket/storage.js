// API-backed match storage. Same interface as the original localStorage version.
import { api } from "@/lib/api";

const ACTIVE_KEY = "cricpadder.activeMatchId.v1";

let cache = [];
let loaded = false;
let inflight = null;

async function refresh() {
  if (inflight) return inflight;
  inflight = api.get("/matches").then((list) => {
    cache = Array.isArray(list) ? list : [];
    loaded = true;
    inflight = null;
    return cache;
  }).catch((e) => {
    inflight = null;
    console.warn("matches load failed", e);
    return cache;
  });
  return inflight;
}

refresh();

export const loadMatches = () => {
  if (!loaded) refresh();
  return cache;
};

export const saveMatches = (matches) => { cache = matches; };

export const upsertMatch = (match) => {
  const idx = cache.findIndex((m) => m.id === match.id);
  if (idx >= 0) cache[idx] = match; else cache.unshift(match);
  api.post("/matches", match).catch((e) => console.warn("save failed", e));
};

export const deleteMatch = (id) => {
  cache = cache.filter((m) => m.id !== id);
  api.del(`/matches/${id}`).catch((e) => console.warn("delete failed", e));
  if (getActiveMatchId() === id) clearActiveMatchId();
};

export const getMatch = (id) => cache.find((m) => m.id === id);

export const setActiveMatchId = (id) => localStorage.setItem(ACTIVE_KEY, id);
export const getActiveMatchId = () => localStorage.getItem(ACTIVE_KEY);
export const clearActiveMatchId = () => localStorage.removeItem(ACTIVE_KEY);

export const refreshMatches = refresh;
