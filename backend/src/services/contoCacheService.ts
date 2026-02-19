import { Request } from "express";

const COMPUTED_CACHE_TTL_MS = 60 * 1000;
const computedSummaryCache = new Map<string, { ts: number; data: any }>();
const computedBreakdownCache = new Map<string, { ts: number; data: any }>();

export const getComputedCacheKey = (req: Request) =>
  `${req.user?._id || "anon"}|${req.user?.role || "none"}|${JSON.stringify(req.query || {})}`;

export const readComputedSummaryCache = (key: string): any | null => {
  const hit = computedSummaryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > COMPUTED_CACHE_TTL_MS) {
    computedSummaryCache.delete(key);
    return null;
  }
  return hit.data;
};

export const writeComputedSummaryCache = (key: string, data: any) => {
  computedSummaryCache.set(key, { ts: Date.now(), data });
};

export const readComputedBreakdownCache = (key: string): any | null => {
  const hit = computedBreakdownCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > COMPUTED_CACHE_TTL_MS) {
    computedBreakdownCache.delete(key);
    return null;
  }
  return hit.data;
};

export const writeComputedBreakdownCache = (key: string, data: any) => {
  computedBreakdownCache.set(key, { ts: Date.now(), data });
};

export const clearComputedContoCaches = () => {
  computedSummaryCache.clear();
  computedBreakdownCache.clear();
};

