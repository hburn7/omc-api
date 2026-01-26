import { describe, it, expect } from "vitest";
import * as validator from "../lib/validator";
import {
  ComplianceFailureReason,
  ComplianceStatus,
  RankStatus,
} from "../lib/dataTypes";
import type { BeatmapWithBeatmapset } from "../lib/dataTypes";
import { Beatmapset } from "osu-api-v2-js";

function createTestBeatmap(beatmapsetId: number = 1): BeatmapWithBeatmapset {
  return {
    id: 1,
    mode: "osu",
    mode_int: 0,
    convert: false,
    difficulty_rating: 5.0,
    version: "Normal",
    total_length: 120,
    user_id: 1,
    passcount: 100,
    playcount: 1000,
    ranked: 1,
    url: "https://osu.ppy.sh/beatmaps/1",
    checksum: "abc123",
    max_combo: 500,
    beatmapset: {
      id: beatmapsetId,
      artist: "Test Artist",
      title: "Test Title",
      creator: "Test Creator",
      user_id: 1,
      source: "",
      covers: {
        cover: "",
        "cover@2x": "",
        card: "",
        "card@2x": "",
        list: "",
        "list@2x": "",
        slimcover: "",
        "slimcover@2x": "",
      },
      favourite_count: 0,
      play_count: 0,
      preview_url: "",
      video: false,
      bpm: 180,
      can_be_hyped: false,
      discussion_locked: false,
      hype: null,
      is_scoreable: true,
      last_updated: new Date(),
      legacy_thread_url: "https://osu.ppy.sh",
      nominations_summary: {
        current: 0,
        eligible_main_rulesets: [],
        required_meta: {
          main_ruleset: 0,
          non_main_ruleset: 0,
        },
      },
      ranked_date: null,
      storyboard: false,
      submitted_date: new Date(),
      tags: "",
      availability: {
        download_disabled: false,
        more_information: null,
      },
      track_id: null,
      status: "graveyard",
      deleted_at: null,
      ranked: Beatmapset.RankStatus.Graveyard,
      artist_unicode: "",
      genre_id: Beatmapset.Genre.Any,
      language_id: Beatmapset.Language.Any,
      nsfw: false,
      offset: 0,
      spotlight: false,
      title_unicode: "",
      rating: 0,
      anime_cover: false
    },
    failtimes: {
      exit: [],
      fail: [],
    },
    owners: [],
    accuracy: 0,
    ar: 0,
    bpm: 0,
    count_circles: 0,
    count_sliders: 0,
    count_spinners: 0,
    cs: 0,
    deleted_at: null,
    drain: 0,
    hit_length: 0,
    is_scoreable: false,
    last_updated: new Date(),
    beatmapset_id: beatmapsetId,
    status: "graveyard",
  } satisfies BeatmapWithBeatmapset;
}

describe("Validator", () => {
  describe("Core Rules", () => {
    describe("Owner fields are included in results", () => {
      it("should include ownerId and ownerUsername in validation results", () => {
        const beatmap = createTestBeatmap();
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          ownerId: 1,
          ownerUsername: "Test Creator",
        });
      });
    });

    describe("DMCA takes precedence over everything", () => {
      it("should disallow even ranked beatmaps with DMCA", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "ranked";
        beatmap.beatmapset.availability.download_disabled = true;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DMCA,
          notes:
            "This beatmapset contains content which has been removed due to a DMCA takedown.",
          ownerId: 1,
          ownerUsername: "Test Creator",
        });
      });
    });

    describe("Ranked/Approved/Loved tracks are always allowed", () => {
      it("should allow ranked tracks even with flagged artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "ranked";
        beatmap.beatmapset.artist = "Igorrr"; // Disallowed artist
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow approved tracks even with banned sources", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "approved";
        beatmap.beatmapset.source = "MEGAREX"; // Banned source
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow loved tracks even with FA-only artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "loved";
        beatmap.beatmapset.artist = "Morimori Atsushi"; // FA-only artist
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow ranked MEGAREX artist tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "ranked";
        beatmap.beatmapset.artist = "lapix";
        beatmap.beatmapset.title = "Cave of Points";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });
    });

    describe("FA Licensed tracks are always allowed", () => {
      it("should allow FA tracks even with disallowed artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Igorrr"; // Disallowed artist
        beatmap.beatmapset.track_id = 1234; // FA track
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow FA tracks even with banned sources", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.source = "MEGAREX"; // Banned source
        beatmap.beatmapset.track_id = 1; // FA track
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow FA tracks from MEGAREX artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "lapix";
        beatmap.beatmapset.title = "Cave of Points";
        beatmap.beatmapset.track_id = 1234; // FA track
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });
    });

    describe("Multiple beatmaps handling", () => {
      it("should handle multiple beatmaps from same beatmapset", () => {
        const beatmap1 = createTestBeatmap(100);
        const beatmap2 = createTestBeatmap(100);
        beatmap2.id = 2;
        beatmap2.version = "Hard";

        const results = validator.validate([beatmap1, beatmap2]);
        expect(results).toHaveLength(1); // Should only have one result for the beatmapset
        expect(results[0]!.beatmapsetId).toBe(100);
      });

      it("should handle multiple beatmaps from different beatmapsets", () => {
        const beatmap1 = createTestBeatmap(100);
        const beatmap2 = createTestBeatmap(200);

        const results = validator.validate([beatmap1, beatmap2]);
        expect(results).toHaveLength(2); // Should have two results for two beatmapsets
        expect(results[0]!.beatmapsetId).toBe(100);
        expect(results[1]!.beatmapsetId).toBe(200);
      });
    });
  });

  describe("data/artists/restricted.json validation", () => {
    describe("fa_only status", () => {
      it("should disallow non-FA tracks from FA-only artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Morimori Atsushi";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.FA_TRACKS_ONLY,
          notes:
            "This artist prohibits usage of tracks which are not licensed through the Featured Artist program.",
        });
      });

      it("should allow FA tracks from FA-only artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Zekk";
        beatmap.beatmapset.track_id = 1234; // FA track
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should detect FA-only artist in collabs", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "uma vs. Morimori Atsushi";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.FA_TRACKS_ONLY,
        });
      });

      it("should detect FA-only artist in title (remix)", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.title = "Song Name (Akira Complex Remix)";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.FA_TRACKS_ONLY,
        });
      });

      it("should allow FA-only artist in title when FA licensed", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.title = "Song Name (Akira Complex Remix)";
        beatmap.beatmapset.track_id = 1234; // FA track
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });
    });

    describe("disallowed status", () => {
      it("should disallow tracks from disallowed artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Igorrr";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_ARTIST,
          notes: "The artist has prohibited usage of their tracks.",
        });
      });

      it("should detect disallowed artist case-insensitive", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "IgOrRr";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_ARTIST,
        });
      });

      it("should detect disallowed artist with spaces in name", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Hatsuki Yura";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_ARTIST,
        });
      });

      it("should detect disallowed artist in title", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.title = "Amazing Track (feat. Igorrr)";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_ARTIST,
        });
      });
    });

    describe("potential status", () => {
      it("should mark potentially disallowed artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "a_hisa";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.POTENTIALLY_DISALLOWED,
          notes:
            "Contact before uploading. Can be reached via [email](mailto:hisaweb_info@yahoo.co.jp) or [Bandcamp](https://a-hisa.bandcamp.com/).",
        });
      });
    });

    describe("Word boundary matching", () => {
      it("should detect NOMA as standalone word", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "NOMA feat. Someone";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });

      it("should not flag NOMA in NOMANOA", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "nomanoa";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });

      it("should not flag NOMA in Tsunomaki Watame", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Tsunomaki Watame";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });

      it("should flag NOMA vs. Someone", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "NOMA vs. Good Artist";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });

      it("should flag NOMA in parentheses", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Track (NOMA Remix)";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });

      it("should not flag potential matches in other words", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Binomaly"; // Contains "noma" but shouldn't flag
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });
    });
  });

  describe("data/overrides/edge-cases.json validation", () => {
    it("should apply override with equalsIgnoreCase matching", () => {
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "Morimori Atsushi";
      beatmap.beatmapset.title = "Tits or get the fuck out!!";

      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.OK,
      });
    });

    it("should apply override with contains matching", () => {
      const beatmap = createTestBeatmap();

      beatmap.beatmapset.artist = "Lusumi";
      beatmap.beatmapset.title = "Something /execution_program.wav Something";

      const results = validator.validate([beatmap]);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.DISALLOWED,
        complianceFailureReason:
          ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        notes: "The rightsholder has prohibited use of this track.",
      });
    });

    it("should handle missing failureReasonOverride field", () => {
      // The first override in edge-cases.json doesn't have failureReasonOverride
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "Morimori Atsushi";
      beatmap.beatmapset.title = "TITS OR GET THE FUCK OUT!!"; // Different case
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.OK,
      });
    });

    it("should not match override with wrong artist", () => {
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "Different Artist";
      beatmap.beatmapset.title = "Different Title";
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
    });

    it("should not match override with wrong title", () => {
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "Lusumi";
      beatmap.beatmapset.title = "Different Title";
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
    });

    it("should take precedence over other validation rules", () => {
      // Morimori Atsushi is FA-only, but the override should allow this specific track
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "Morimori Atsushi";
      beatmap.beatmapset.title = "Tits or get the fuck out!!";

      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.OK,
      });
    });
  });

  describe("data/sources/banned.json validation", () => {
    describe("Source field matching", () => {
      it("should disallow beatmaps with MEGAREX source", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.source = "MEGAREX";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
          notes: "The track is from a prohibited source.",
        });
      });

      it("should disallow beatmaps with DJMax source variations", () => {
        const sources = ["DJMax", "DJ Max", "djmax", "DJMAX Portable 3"];
        for (const source of sources) {
          const beatmap = createTestBeatmap();
          beatmap.beatmapset.source = source;
          const results = validator.validate([beatmap]);
          expect(results).toHaveLength(1);
          expect(results[0]).toMatchObject({
            beatmapsetId: 1,
            complianceStatus: ComplianceStatus.DISALLOWED,
            complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
          });
        }
      });

      it("should disallow beatmaps with neowiz source", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.source = "neowiz";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
        });
      });

      it("should detect banned source case-insensitive", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.source = "megarex"; // lowercase
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
        });
      });
    });

    describe("Tags containing banned sources", () => {
      it("should disallow beatmaps with banned sources in tags", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.tags = "some,djmax,tag";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
        });
      });

      it("should disallow multiple banned sources in tags", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.tags = "djmax,megarex,neowiz";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
        });
      });

      it("should handle empty tags", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.tags = "";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });
    });

    describe("FA licensed overrides banned source", () => {
      it("should allow FA tracks even with banned source", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.source = "MEGAREX";
        beatmap.beatmapset.track_id = 1234; // FA track
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });
    });
  });

  describe("data/labels/MEGAREX.json validation", () => {
    describe("Artist and title matching", () => {
      it("should disallow non-FA MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "lapix";
        beatmap.beatmapset.title = "Cave of Points";

        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
          notes: "The rightsholder has prohibited use of this track.",
        });
      });

      it("should allow FA MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "lapix";
        beatmap.beatmapset.title = "Cave of Points";
        beatmap.beatmapset.track_id = 1234; // FA track
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should handle case-insensitive artist matching", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "LAPIX"; // Different case
        beatmap.beatmapset.title = "Cave of Points";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });

      it("should handle case-insensitive title matching", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "lapix";
        beatmap.beatmapset.title = "CAVE OF POINTS"; // Different case
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });

      it("should handle potential title matches", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "lapix";
        beatmap.beatmapset.title = "NEO GRAVITY (Extended)";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });

      it("should disallow multiple MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "Camellia";
        beatmap.beatmapset.title = "What Is Hitech?";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });

      it("should disallow collab artists with MEGAREX members", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "lapix & Camellia";
        beatmap.beatmapset.title = "Dead Music";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });
    });

    describe("MEGAREX tracks with approved status", () => {
      it("should allow ranked MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "ranked";
        beatmap.beatmapset.artist = "Camellia";
        beatmap.beatmapset.title = "What Is Hitech?";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow approved MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "approved";
        beatmap.beatmapset.artist = "PSYQUI";
        beatmap.beatmapset.title = "Hype feat. Such";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow loved MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "loved";
        beatmap.beatmapset.artist = "Mameyudoufu";
        beatmap.beatmapset.title = "Quality Control";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });
    });

    describe("MEGAREX tracks with non-approved status", () => {
      it("should disallow graveyard MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "graveyard";
        beatmap.beatmapset.artist = "Zekk";
        beatmap.beatmapset.title = "Swampgator";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });

      it("should disallow pending MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "pending";
        beatmap.beatmapset.artist = "Blacklolita";
        beatmap.beatmapset.title = "FlashWarehouse(^-^)";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });

      it("should disallow qualified MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "qualified";
        beatmap.beatmapset.artist = "DJ Noriken";
        beatmap.beatmapset.title = "Smokey";
        beatmap.beatmapset.track_id = null;

        const results = validator.validate([beatmap]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });

      it("should disallow WIP MEGAREX tracks", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.status = "wip";
        beatmap.beatmapset.artist = "PSYQUI";
        beatmap.beatmapset.title = "Hype feat. Such";

        const results = validator.validate([beatmap]);

        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason:
            ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
        });
      });
    });

    describe("Non-MEGAREX tracks", () => {
      it("should allow non-MEGAREX artists", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "NotLapix";
        beatmap.beatmapset.title = "Some Song";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });

      it("should allow MEGAREX artist with non-MEGAREX track", () => {
        const beatmap = createTestBeatmap();
        beatmap.beatmapset.artist = "lapix";
        beatmap.beatmapset.title = "Not In The MEGAREX List";
        beatmap.beatmapset.track_id = null;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          beatmapsetId: 1,
          complianceStatus: ComplianceStatus.OK,
        });
      });
    });
  });

  describe("Parenthetical content matching", () => {
    it("should flag 'Flying Castle' when label has 'Flying Castle (Extended Mix)'", () => {
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "lapix";
      beatmap.beatmapset.title = "Flying Castle";
      beatmap.beatmapset.track_id = null;
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.DISALLOWED,
        complianceFailureReason:
          ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
      });
    });

    it("should flag 'Flying Castle (Extended Mix)' when label has 'Flying Castle (Extended Mix)'", () => {
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "lapix";
      beatmap.beatmapset.title = "Flying Castle (Extended Mix)";
      beatmap.beatmapset.track_id = null;
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.DISALLOWED,
        complianceFailureReason:
          ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
      });
    });

    it("should NOT flag 'Flying Castle' from different artist", () => {
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "Different Artist";
      beatmap.beatmapset.title = "Flying Castle";
      beatmap.beatmapset.track_id = null;
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.OK,
      });
    });

    it("should NOT flag 'Beachy Saturday' when label has 'Beachy Saturday Afternoon'", () => {
      const beatmap = createTestBeatmap();
      beatmap.beatmapset.artist = "Some Artist";
      beatmap.beatmapset.title = "Beachy Saturday";
      beatmap.beatmapset.track_id = null;
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapsetId: 1,
        complianceStatus: ComplianceStatus.OK,
      });
    });
  });

  describe("Helper functions", () => {
    describe("flagKeyMatch", () => {
      it("should match known artist", () => {
        const artist = "Igorrr";
        expect(validator.flagKeyMatch(artist)).toBe("Igorrr");
      });

      it("should match artist case-insensitive", () => {
        const artist = "IgOrRr";
        expect(validator.flagKeyMatch(artist)).toBe("Igorrr");
      });

      it("should match artist in collab", () => {
        const artist = "igorrr vs. Camellia";
        expect(validator.flagKeyMatch(artist)).toBe("Igorrr");
      });

      it("should match artist with word boundaries", () => {
        const artist = "NOMA feat. Someone";
        expect(validator.flagKeyMatch(artist)).toBe("NOMA");
      });

      it("should not match potential word", () => {
        const artist = "NOMANOA";
        expect(validator.flagKeyMatch(artist)).toBe(null);
      });
    });

    describe("isLicensed", () => {
      it("should return true for positive track ID", () => {
        expect(validator.isLicensed(1234)).toBe(true);
      });

      it("should return false for null track ID", () => {
        expect(validator.isLicensed(null)).toBe(false);
      });

      it("should return false for undefined track ID", () => {
        expect(validator.isLicensed(undefined)).toBe(false);
      });

      it("should return false for zero track ID", () => {
        expect(validator.isLicensed(0)).toBe(false);
      });

      it("should return false for negative track ID", () => {
        expect(validator.isLicensed(-1)).toBe(false);
      });
    });

    describe("isStatusApproved", () => {
      it("should approve ranked status", () => {
        expect(validator.isStatusApproved(RankStatus.RANKED)).toBe(true);
      });

      it("should approve approved status", () => {
        expect(validator.isStatusApproved(RankStatus.APPROVED)).toBe(true);
      });

      it("should approve loved status", () => {
        expect(validator.isStatusApproved(RankStatus.LOVED)).toBe(true);
      });

      it("should not approve graveyard status", () => {
        expect(validator.isStatusApproved(RankStatus.GRAVEYARD)).toBe(false);
      });

      it("should not approve pending status", () => {
        expect(validator.isStatusApproved(RankStatus.PENDING)).toBe(false);
      });

      it("should not approve qualified status", () => {
        expect(validator.isStatusApproved(RankStatus.QUALIFIED)).toBe(false);
      });

      it("should not approve WIP status", () => {
        expect(validator.isStatusApproved(RankStatus.WIP)).toBe(false);
      });
    });

    describe("isDmca", () => {
      it("should detect DMCA when download disabled", () => {
        const beatmapset = {
          availability: {
            download_disabled: true,
            more_information: null,
          },
        } as Beatmapset.Extended;
        expect(validator.isDmca(beatmapset)).toBe(true);
      });

      it("should detect DMCA when more info present", () => {
        const beatmapset = {
          availability: {
            download_disabled: false,
            more_information: "DMCA notice",
          },
        } as Beatmapset.Extended;
        expect(validator.isDmca(beatmapset)).toBe(true);
      });

      it("should not detect DMCA when both false/null", () => {
        const beatmapset = {
          availability: {
            download_disabled: false,
            more_information: null,
          },
        } as Beatmapset.Extended;
        expect(validator.isDmca(beatmapset)).toBe(false);
      });
    });

    describe("isBannedSource", () => {
      it("should detect MEGAREX source", () => {
        const sources = ["MEGAREX", "megarex"];

        for (const source of sources) {
          expect(validator.isBannedSource(source)).toBe(true);
        }
      });

      it("should detect DJMax variations", () => {
        const mySources = ["DJMAX", "djmax", "DJ MAX", "neowiz"];

        for (const source of mySources) {
          expect(validator.isBannedSource(source)).toBe(true);
        }
      });

      it("should detect neowiz source", () => {
        const source = "neowiz";
        expect(validator.isBannedSource(source)).toBe(true);
      });

      it("should allow non-banned source", () => {
        const source = "Arcaea";
        expect(validator.isBannedSource(source)).toBe(false);
      });

      it("should not detect potential source", () => {
        const source = "max";
        expect(validator.isBannedSource(source)).toBe(false);
      });
    });

    describe("tagContainsBannedSource", () => {
      it("should detect banned source in tags", () => {
        const tags = "some,djmax,tag";
        expect(validator.tagContainsBannedSource(tags)).toBe(true);
      });

      it("should detect multiple banned sources", () => {
        const tags = "megarex,neowiz";
        expect(validator.tagContainsBannedSource(tags)).toBe(true);
      });

      it("should allow beatmapset without banned sources in tags", () => {
        const tags = "rhythm,game,original";
        expect(validator.tagContainsBannedSource(tags)).toBe(false);
      });

      it("should handle empty tags", () => {
        const tags = "";
        expect(validator.tagContainsBannedSource(tags)).toBe(false);
      });
    });

    describe("findOverride", () => {
      it("should find override with exact artist and title match", () => {
        const artist = "Morimori Atsushi";
        const title = "Tits or get the fuck out!!";

        const override = validator.findOverride(artist, title);

        expect(override).toBeTruthy();
        expect(override?.resultOverride).toBe("ok");
      });

      it("should not find override with wrong artist", () => {
        const artist = "Wrong Artist";
        const title = "Tits or get the fuck out!!";
        const override = validator.findOverride(artist, title);
        expect(override).toBeNull();
      });

      it("should not find override with wrong title", () => {
        const artist = "Morimori Atsushi";
        const title = "Wrong Title";
        const override = validator.findOverride(artist, title);
        expect(override).toBeNull();
      });
    });

    describe("getFlaggedArtistInTitle", () => {
      it("should detect flagged artist in remix", () => {
        const title = "Flower Petal (Igorrr Remix)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe("Igorrr");
        expect(status).toBe("disallowed");
      });

      it("should detect flagged artist in feat", () => {
        const title = "Really Long Name (feat. Igorrr)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe("Igorrr");
        expect(status).toBe("disallowed");
      });

      it("should detect flagged artist case-insensitive", () => {
        const title = "Some Song (IgOrRr Remix)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe("Igorrr");
        expect(status).toBe("disallowed");
      });

      it("should detect artist with space in name", () => {
        const title = "Something (Hatsuki Yura Remix)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe("Hatsuki Yura");
        expect(status).toBe("disallowed");
      });

      it("should not detect in normal title", () => {
        const title = "Normal Song Title";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBeNull();
        expect(status).toBeNull();
      });

      it("should not detect potential word match", () => {
        const title = "NOMANOA Remix";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBeNull();
        expect(status).toBeNull();
      });
    });

    describe("checkFlaggedArtist", () => {
      it("should return null if track is FA licensed", () => {
        const beatmapset = {
          id: 1,
          artist: "Morimori Atsushi",
          track_id: 1234,
        } as Beatmapset.Extended;
        expect(validator.checkFlaggedArtist(beatmapset)).toBe(null);
      });

      it("should return disallowed for disallowed artists", () => {
        const beatmapset = {
          id: 1,
          artist: "Igorrr",
          track_id: null,
        } as Beatmapset.Extended;
        const result = validator.checkFlaggedArtist(beatmapset);
        expect(result?.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
        expect(result?.complianceFailureReason).toBe(
          ComplianceFailureReason.DISALLOWED_ARTIST
        );
      });

      it("should return potentially disallowed for potential artists", () => {
        const beatmapset = {
          id: 1,
          artist: "a_hisa",
          track_id: null,
        } as Beatmapset.Extended;
        const result = validator.checkFlaggedArtist(beatmapset);
        expect(result?.complianceStatus).toBe(
          ComplianceStatus.POTENTIALLY_DISALLOWED
        );
        expect(result?.notes).toContain("Contact before uploading");
      });

      it("should return disallowed for FA-only artists without FA", () => {
        const beatmapset = {
          id: 1,
          artist: "Zekk",
          track_id: null,
        } as Beatmapset.Extended;
        const result = validator.checkFlaggedArtist(beatmapset);
        expect(result?.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
        expect(result?.complianceFailureReason).toBe(
          ComplianceFailureReason.FA_TRACKS_ONLY
        );
      });
    });
  });

  describe("validateRawMetadata", () => {
    it("should return OK for clean artist and title", () => {
      const result = validator.validateRawMetadata({
        artist: "Some Artist",
        title: "Some Title",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.OK);
      expect(result.artist).toBe("Some Artist");
      expect(result.title).toBe("Some Title");
    });

    it("should return OK when isFeaturedArtist is true", () => {
      const result = validator.validateRawMetadata({
        artist: "Igorrr",
        title: "Disallowed Track",
        isFeaturedArtist: true,
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.OK);
    });

    it("should return OK for ranked status", () => {
      const result = validator.validateRawMetadata({
        artist: "Igorrr",
        title: "Some Track",
        status: "ranked",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.OK);
    });

    it("should return OK for loved status", () => {
      const result = validator.validateRawMetadata({
        artist: "Igorrr",
        title: "Some Track",
        status: "loved",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.OK);
    });

    it("should return DISALLOWED for disallowed artist", () => {
      const result = validator.validateRawMetadata({
        artist: "Igorrr",
        title: "Some Track",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(result.complianceFailureReason).toBe(ComplianceFailureReason.DISALLOWED_ARTIST);
    });

    it("should return DISALLOWED for banned source", () => {
      const result = validator.validateRawMetadata({
        artist: "Some Artist",
        title: "Some Title",
        source: "MEGAREX",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(result.complianceFailureReason).toBe(ComplianceFailureReason.DISALLOWED_SOURCE);
    });

    it("should return DISALLOWED for banned source in tags", () => {
      const result = validator.validateRawMetadata({
        artist: "Some Artist",
        title: "Some Title",
        tags: "some,djmax,tag",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(result.complianceFailureReason).toBe(ComplianceFailureReason.DISALLOWED_SOURCE);
    });

    it("should return DISALLOWED for label violation", () => {
      const result = validator.validateRawMetadata({
        artist: "lapix",
        title: "Cave of Points",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(result.complianceFailureReason).toBe(ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER);
    });

    it("should return DISALLOWED for FA-only artist without FA", () => {
      const result = validator.validateRawMetadata({
        artist: "Morimori Atsushi",
        title: "Some Track",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(result.complianceFailureReason).toBe(ComplianceFailureReason.FA_TRACKS_ONLY);
    });

    it("should return OK for FA-only artist with isFeaturedArtist", () => {
      const result = validator.validateRawMetadata({
        artist: "Morimori Atsushi",
        title: "Some Track",
        isFeaturedArtist: true,
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.OK);
    });

    it("should return POTENTIALLY_DISALLOWED for potential artist", () => {
      const result = validator.validateRawMetadata({
        artist: "a_hisa",
        title: "Some Track",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.POTENTIALLY_DISALLOWED);
      expect(result.notes).toContain("Contact before uploading");
    });

    it("should apply override rules", () => {
      const result = validator.validateRawMetadata({
        artist: "Morimori Atsushi",
        title: "Tits or get the fuck out!!",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.OK);
    });

    it("should detect flagged artist in title", () => {
      const result = validator.validateRawMetadata({
        artist: "Some Artist",
        title: "Song (Igorrr Remix)",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      expect(result.complianceFailureReason).toBe(ComplianceFailureReason.DISALLOWED_ARTIST);
    });

    it("should handle missing optional fields", () => {
      const result = validator.validateRawMetadata({
        artist: "Clean Artist",
        title: "Clean Title",
      });
      expect(result.complianceStatus).toBe(ComplianceStatus.OK);
      expect(result.complianceFailureReason).toBeUndefined();
      expect(result.notes).toBeUndefined();
    });
  });
});
