import { api } from "./osuApi"

export async function fetchBeatmaps(beatmapIds: number[]) {
    return await api.getBeatmaps(beatmapIds)
}