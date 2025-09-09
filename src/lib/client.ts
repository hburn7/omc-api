import { api } from "./osuApi.ts";
import type { Beatmap } from "osu-api-v2-js";

const chunk = (arr: any[], size: number) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_: any, i: number) =>
    arr.slice(i * size, i * size + size)
  );

export async function fetchBeatmaps(
  beatmapIds: number[]
): Promise<Beatmap.Extended.WithFailtimesOwnersMaxcomboBeatmapset[]> {
  // Fetch each beatmap individually to get beatmapset data
  const promises = chunk(beatmapIds, 50).map((arr) => api.getBeatmaps(arr));
  const beatmaps = await Promise.all(promises);

  return beatmaps.flat();
}
