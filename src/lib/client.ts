import { api } from "./osuApi.ts"

export async function fetchBeatmaps(beatmapIds: number[]) {
    return await api.getBeatmaps(beatmapIds)
}