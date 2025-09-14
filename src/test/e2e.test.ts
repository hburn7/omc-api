import { describe, it, expect } from "vitest";
import { fetchBeatmaps } from "../lib/client";
import * as validator from "../lib/validator";
import { ComplianceFailureReason, ComplianceStatus } from "../lib/dataTypes";

describe("End-to-end tests", () => {
  describe("Beatmap fetch and validation flow", () => {
    it("should fetch and validate beatmap 4074595 as OK with beatmap ID in results", async () => {
      const beatmapId = 4074595;

      const fetchResult = await fetchBeatmaps([beatmapId]);

      expect(fetchResult.failures).toHaveLength(0);
      expect(fetchResult.beatmaps).toHaveLength(1);
      expect(fetchResult.beatmaps[0]?.id).toBe(beatmapId);

      const validationResults = validator.validate(fetchResult.beatmaps);

      expect(validationResults).toHaveLength(1);
      expect(validationResults[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      expect(validationResults[0]!.beatmapIds).toContain(beatmapId);
    });

    it("should fetch and multiple beatmaps from the same set with beatmap IDs in results", async () => {
      const beatmapId1 = 4959509;
      const beatmapId2 = 4959511;

      const fetchResult = await fetchBeatmaps([beatmapId1, beatmapId2]);

      expect(fetchResult.failures).toHaveLength(0);
      expect(fetchResult.beatmaps).toHaveLength(2);
      expect(fetchResult.beatmaps[0]?.id).toBe(beatmapId1);
      expect(fetchResult.beatmaps[1]?.id).toBe(beatmapId2);

      const validationResults = validator.validate(fetchResult.beatmaps);

      expect(validationResults).toHaveLength(1);
      expect(validationResults[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      expect(validationResults[0]!.beatmapIds).toContain(beatmapId1);
      expect(validationResults[0]!.beatmapIds).toContain(beatmapId2);
    });

    it("should fetch and validate beatmap 4062794 as disallowed [MEGAREX]", async () => {
      const beatmapId = 4062794;

      const fetchResult = await fetchBeatmaps([beatmapId]);
      const beatmapset = fetchResult.beatmaps[0]?.beatmapset;

      expect(beatmapset).not.null;
      expect(fetchResult.failures).toHaveLength(0);
      expect(fetchResult.beatmaps).toHaveLength(1);
      expect(fetchResult.beatmaps[0]?.id).toBe(beatmapId);

      const validationResults = validator.validate(fetchResult.beatmaps);

      expect(validationResults).toHaveLength(1);
      expect(validationResults[0]?.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(validationResults[0]?.complianceFailureReason).toBe(ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER);

      logTitleArtist(beatmapset!.title, beatmapset!.artist);
    });

    it("should fetch and validate beatmap 1416722 as disallowed [DMCA]", async () => {
      const beatmapId = 1416722;

      const fetchResult = await fetchBeatmaps([beatmapId]);
      const beatmapset = fetchResult.beatmaps[0]?.beatmapset;

      expect(beatmapset).not.null;
      expect(fetchResult.failures).toHaveLength(0);
      expect(fetchResult.beatmaps).toHaveLength(1);
      expect(fetchResult.beatmaps[0]?.id).toBe(beatmapId);

      const validationResults = validator.validate(fetchResult.beatmaps);

      expect(validationResults).toHaveLength(1);
      expect(validationResults[0]?.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(validationResults[0]?.complianceFailureReason).toBe(ComplianceFailureReason.DMCA);

      logTitleArtist(beatmapset!.title, beatmapset!.artist);
    });
  });
});

function logTitleArtist(title: string, artist: string) {
  console.log(`[${artist} - ${title}]`)
}