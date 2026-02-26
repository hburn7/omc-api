import { describe, expect, it, vi, beforeEach } from "vitest";
import { fetchBeatmaps } from "../lib/client";

const mockGetBeatmaps = vi.fn();

vi.mock("../lib/osuApi", () => ({
  api: {
    getBeatmaps: (...args: any[]) => mockGetBeatmaps(...args),
  },
}));

vi.mock("../lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}));

describe("fetchBeatmaps", () => {
  beforeEach(() => {
    mockGetBeatmaps.mockReset();
  });

  it("should successfully fetch beatmaps and return them", async () => {
    const mockBeatmaps = [
      { id: 1, beatmapset_id: 100 },
      { id: 2, beatmapset_id: 101 },
      { id: 3, beatmapset_id: 102 },
    ] as any;

    mockGetBeatmaps.mockResolvedValue(mockBeatmaps);

    const result = await fetchBeatmaps([1, 2, 3]);

    expect(result.beatmaps).toEqual(mockBeatmaps);
    expect(result.failures).toEqual([]);
    expect(mockGetBeatmaps).toHaveBeenCalledTimes(1);
    expect(mockGetBeatmaps).toHaveBeenCalledWith([1, 2, 3]);
  });

  it("should handle chunking for large beatmap ID arrays", async () => {
    const beatmapIds = Array.from({ length: 120 }, (_, i) => i + 1);
    const mockBeatmaps1 = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
    })) as any;
    const mockBeatmaps2 = Array.from({ length: 50 }, (_, i) => ({
      id: i + 51,
    })) as any;
    const mockBeatmaps3 = Array.from({ length: 20 }, (_, i) => ({
      id: i + 101,
    })) as any;

    mockGetBeatmaps
      .mockResolvedValueOnce(mockBeatmaps1)
      .mockResolvedValueOnce(mockBeatmaps2)
      .mockResolvedValueOnce(mockBeatmaps3);

    const result = await fetchBeatmaps(beatmapIds);

    expect(result.beatmaps).toHaveLength(120);
    expect(result.failures).toEqual([]);
    expect(mockGetBeatmaps).toHaveBeenCalledTimes(3);
    expect(mockGetBeatmaps).toHaveBeenNthCalledWith(1, beatmapIds.slice(0, 50));
    expect(mockGetBeatmaps).toHaveBeenNthCalledWith(
      2,
      beatmapIds.slice(50, 100),
    );
    expect(mockGetBeatmaps).toHaveBeenNthCalledWith(
      3,
      beatmapIds.slice(100, 120),
    );
  });

  it("should return failure IDs for beatmaps that couldn't be fetched", async () => {
    const mockBeatmaps = [
      { id: 1, beatmapset_id: 100 },
      { id: 3, beatmapset_id: 102 },
    ] as any;

    mockGetBeatmaps.mockResolvedValue(mockBeatmaps);

    const result = await fetchBeatmaps([1, 2, 3, 4]);

    expect(result.beatmaps).toEqual(mockBeatmaps);
    expect(result.failures).toEqual([2, 4]);
    expect(mockGetBeatmaps).toHaveBeenCalledTimes(1);
  });

  it("should handle API errors gracefully", async () => {
    mockGetBeatmaps.mockRejectedValue(new Error("API Error"));

    await expect(fetchBeatmaps([1, 2, 3])).rejects.toThrow("API Error");
    expect(mockGetBeatmaps).toHaveBeenCalledTimes(1);
  });
});
