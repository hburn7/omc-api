import { api } from "./osuApi.ts";
import type { Beatmap } from "osu-api-v2-js";

interface FetchBeatmapsResult {
  beatmaps: Beatmap.Extended.WithFailtimesOwnersMaxcomboBeatmapset[],
  /** IDs of the beatmaps that failed to fetch */
  failures: number[]
}

const chunk = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_: any, i: number) =>
    arr.slice(i * size, i * size + size),
  );

export async function fetchBeatmaps(
  beatmapIds: number[],
): Promise<FetchBeatmapsResult> {
  // Fetch each beatmap individually to get beatmapset data
  const promises = chunk(beatmapIds, 50).map((arr) => api.getBeatmaps(arr));
  const beatmaps = await Promise.all(promises);

  const flatBeatmaps = beatmaps.flat();
  const fetchedIds = new Set(flatBeatmaps.map(b => b.id));
  const failureIds = beatmapIds.filter(id => !fetchedIds.has(id));

  return {
    beatmaps: flatBeatmaps,
    failures: failureIds
  }
}
