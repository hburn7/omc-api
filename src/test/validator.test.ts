import { describe, it, expect } from 'vitest';
import * as validator from '../lib/validator';
import { ComplianceFailureReason, ComplianceStatus, RankStatus } from '../lib/dataTypes';
import type { BeatmapWithBeatmapset } from '../lib/dataTypes';

function createTestBeatmap(beatmapsetId: number = 1): BeatmapWithBeatmapset {
  return {
    id: 1,
    beatmapset_id: beatmapsetId,
    mode: 'osu',
    mode_int: 0,
    convert: false,
    difficulty_rating: 5.0,
    version: 'Normal',
    total_length: 120,
    user_id: 1,
    passcount: 100,
    playcount: 1000,
    ranked: 1,
    url: 'https://osu.ppy.sh/beatmaps/1',
    checksum: 'abc123',
    max_combo: 500,
    beatmapset: {
      id: beatmapsetId,
      artist: 'Some cool allowed artist',
      title: 'Some title',
      creator: 'Test Creator',
      user_id: 1,
      source: null,
      covers: {
        cover: '',
        cover2x: '',
        card: '',
        card2x: '',
        list: '',
        list2x: '',
        slimcover: '',
        slimcover2x: ''
      },
      favourite_count: 0,
      play_count: 0,
      preview_url: '',
      video: false,
      bpm: 180,
      can_be_hyped: false,
      discussion_enabled: true,
      discussion_locked: false,
      hype: null,
      is_scoreable: true,
      last_updated: new Date().toISOString(),
      legacy_thread_url: null,
      nominations_summary: {
        current: 0,
        eligible_main_rulesets: [],
        required_meta: {
          main_ruleset: 0,
          non_main_ruleset: 0
        }
      },
      ranked_date: null,
      storyboard: false,
      submitted_date: new Date().toISOString(),
      tags: [],
      availability: {
        download_disabled: false,
        more_information: null
      },
      track_id: null,
      status: 'graveyard'
    }
  } as any as BeatmapWithBeatmapset;
}

function createNoDmcaRankedBeatmap(beatmapsetId: number = 1): BeatmapWithBeatmapset {
  const beatmap = createTestBeatmap(beatmapsetId);
  beatmap.beatmapset.status = 'ranked';
  return beatmap;
}

function createNoDmcaGraveyardBeatmap(beatmapsetId: number = 1): BeatmapWithBeatmapset {
  const beatmap = createTestBeatmap(beatmapsetId);
  beatmap.beatmapset.status = 'graveyard';
  return beatmap;
}

describe('Validator', () => {
  describe('validate', () => {
    it('is compliant', () => {
      const beatmap = createNoDmcaGraveyardBeatmap();
      beatmap.beatmapset.artist = "Camellia";
      beatmap.beatmapset.title = "Whoa there hoss";
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapset_id: 1,
        complianceStatus: ComplianceStatus.OK
      });
    });

    it('is not compliant due to not an FA track', () => {
      const beatmap = createNoDmcaGraveyardBeatmap();
      beatmap.beatmapset.artist = "Zekk";
      beatmap.beatmapset.title = "Freefall";
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapset_id: 1,
        complianceStatus: ComplianceStatus.DISALLOWED,
        complianceFailureReason: ComplianceFailureReason.FA_TRACKS_ONLY,
        notes: "Do not use or upload tracks that are not available on the creator's Featured Artist listing."
      });
    });

    it('is compliant due to FA track', () => {
      const beatmap = createNoDmcaGraveyardBeatmap();
      beatmap.beatmapset.artist = "Zekk";
      beatmap.beatmapset.title = "Freefall IS NOW FA WHAAAAT";
      beatmap.beatmapset.track_id = 1; // positive int = FA
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapset_id: 1,
        complianceStatus: ComplianceStatus.OK
      });
    });

    it('is disallowed artist', () => {
      const beatmap = createNoDmcaGraveyardBeatmap();
      beatmap.beatmapset.artist = "Igorrr";
      beatmap.beatmapset.title = "What the cat?!?";
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapset_id: 1,
        complianceStatus: ComplianceStatus.DISALLOWED,
        complianceFailureReason: ComplianceFailureReason.DISALLOWED_ARTIST,
      });
    });

    it('is disallowed by rightsholder', () => {
      const beatmap = createNoDmcaGraveyardBeatmap();
      beatmap.beatmapset.artist = "Who the hecc is this new arteest";
      beatmap.beatmapset.title = "What the skibidi?!?";
      beatmap.beatmapset.source = "MEGAREX";
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapset_id: 1,
        complianceStatus: ComplianceStatus.DISALLOWED,
        complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
      });
    });

    it('is would be disallowed by rightsholder except not this time because it\'s FA, kapeesh?', () => {
      const beatmap = createNoDmcaGraveyardBeatmap();
      beatmap.beatmapset.artist = "Who the hecc is this new FA that megarex is cool with being on osu!?!";
      beatmap.beatmapset.title = "What the skibidi?!?";
      beatmap.beatmapset.source = "MEGAREX";
      beatmap.beatmapset.track_id = 1;
      const results = validator.validate([beatmap]);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        beatmapset_id: 1,
        complianceStatus: ComplianceStatus.OK,
      });
    });

    it('handles multiple beatmaps from same beatmapset', () => {
      const beatmap1 = createNoDmcaGraveyardBeatmap(100);
      const beatmap2 = createNoDmcaGraveyardBeatmap(100);
      beatmap2.id = 2;
      beatmap2.version = 'Hard';
      
      const results = validator.validate([beatmap1, beatmap2]);
      expect(results).toHaveLength(1); // Should only have one result for the beatmapset
      expect(results[0]!.beatmapset_id).toBe(100);
    });

    it('handles multiple beatmaps from different beatmapsets', () => {
      const beatmap1 = createNoDmcaGraveyardBeatmap(100);
      const beatmap2 = createNoDmcaGraveyardBeatmap(200);
      
      const results = validator.validate([beatmap1, beatmap2]);
      expect(results).toHaveLength(2); // Should have two results for two beatmapsets
      expect(results[0]!.beatmapset_id).toBe(100);
      expect(results[1]!.beatmapset_id).toBe(200);
    });
  });

  describe('Helper functions', () => {
    describe('flagKeyMatch', () => {
      it('should flag known artist', () => {
        const artist = 'Igorrr';
        expect(validator.flagKeyMatch(artist)).toBe('Igorrr');
      });

      it('should flag artist case-insensitive', () => {
        const artist = 'IgOrRr';
        expect(validator.flagKeyMatch(artist)).toBe('Igorrr');
      });

      it('should flag artist in collab', () => {
        const artist = 'igorrr vs. Camellia';
        expect(validator.flagKeyMatch(artist)).toBe('Igorrr');
      });
    });

    describe('isLicensed', () => {
      it('should return true for licensed track', () => {
        const trackId = 1234;
        expect(validator.isLicensed(trackId)).toBe(true);
      });

      it('should return false for non-licensed track', () => {
        const trackId = null;
        expect(validator.isLicensed(trackId)).toBe(false);
      });
    });

    describe('isStatusApproved', () => {
      it('should approve ranked, approved, and loved statuses', () => {
        const statuses = [RankStatus.RANKED, RankStatus.APPROVED, RankStatus.LOVED];
        for (const status of statuses) {
          expect(validator.isStatusApproved(status)).toBe(true);
        }
      });
    });

    describe('isDmca', () => {
      it('should detect DMCA when download disabled', () => {
        const beatmapset = {
          availability: {
            download_disabled: true,
            more_information: null
          }
        };
        expect(validator.isDmca(beatmapset)).toBe(true);
      });

      it('should detect DMCA when more info present', () => {
        const beatmapset = {
          availability: {
            download_disabled: false,
            more_information: 'blah'
          }
        };
        expect(validator.isDmca(beatmapset)).toBe(true);
      });
    });

    describe('isBannedSource', () => {
      const beatmapsets = [
        { source: "DJMAX" },
        { source: "DJ MAX" },
        { source: "djmax" },
        { source: "neowiz" },
        { source: "DJMAX Portable 3" },
        { source: "megarex" },
        { source: "MEGAREX" },
      ];

      it('should detect banned sources', () => {
        for (const beatmapset of beatmapsets) {
          expect(validator.isBannedSource(beatmapset)).toBe(true);
        }
      });

      it('should allow non-banned source', () => {
        const beatmapset = { source: "chillierpear" };
        expect(validator.isBannedSource(beatmapset)).toBe(false);
      });
    });

    describe('tagContainsBannedSource', () => {
      it('should detect banned source in tags', () => {
        const beatmapset = {
          tags: ['some', 'djmax', 'tag']
        };
        expect(validator.tagContainsBannedSource(beatmapset)).toBe(true);
      });

      it('should allow beatmapset without banned sources in tags', () => {
        const beatmapset = {
          tags: ['chillierpear', 'osu', 'game']
        };
        expect(validator.tagContainsBannedSource(beatmapset)).toBe(false);
      });

      it('should handle empty tags', () => {
        const beatmapset = {
          tags: []
        };
        expect(validator.tagContainsBannedSource(beatmapset)).toBe(false);
      });

      it('should handle missing tags', () => {
        const beatmapset = {};
        expect(validator.tagContainsBannedSource(beatmapset)).toBe(false);
      });
    });

    describe('checkFlaggedArtist', () => {
      it('should return null if the track is FA licensed', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.track_id = 1;
        expect(validator.checkFlaggedArtist(beatmap.beatmapset)).toBe(null);
      });

      it('should return potentially disallowed for potentially disallowed artists', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'a_hisa'

        const result = validator.checkFlaggedArtist(beatmap.beatmapset);

        expect(result?.complianceStatus).toBe(ComplianceStatus.POTENTIALLY_DISALLOWED);
        expect(result?.notes).toBe("Contact before uploading. Can be reached via [email](mailto:hisaweb_info@yahoo.co.jp) or [Bandcamp](https://a-hisa.bandcamp.com/).")
      });
    })

    describe('Edge cases', () => {
      it('should handle uma vs. Morimori Atsushi FA only', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'uma vs. Morimori Atsushi';
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
        expect(results[0]!.complianceFailureReason).toBe(ComplianceFailureReason.FA_TRACKS_ONLY);
      });

      it('should not flag NOMA in NOMANOA', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'nomanoa';
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });

      it('should not flag NOMA in Tsunomaki Watame', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'Tsunomaki Watame';
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });

      it('should flag NOMA vs. Someone', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'NOMA vs. Good Artist';
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });

      it('should handle various word boundary edge cases', () => {
        // Test 1: Artist name at the beginning
        let beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'NOMA feat. Someone';
        let results = validator.validate([beatmap]);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);

        // Test 2: Artist name at the end
        beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'Someone feat. NOMA';
        results = validator.validate([beatmap]);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);

        // Test 3: Artist name in parentheses
        beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'Track (NOMA Remix)';
        results = validator.validate([beatmap]);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);

        // Test 4: Artist name with punctuation
        beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'NOMA, Someone Else';
        results = validator.validate([beatmap]);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);

        // Test 5: Partial match should not flag when part of another word
        beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'Binomaly'; // Contains "noma" but shouldn't flag
        results = validator.validate([beatmap]);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });

      it('should disallow space in name', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = 'Hatsuki Yura';
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });
    });

    describe('Overrides', () => {
      it('should allow override', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = "Morimori Atsushi";
        beatmap.beatmapset.title = "Tits or get the fuck out!!";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });

      it('should disallow override', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.artist = "Lusumi";
        beatmap.beatmapset.title = "/execution_program.wav";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });

      it('should check overrides correctly', () => {
        let beatmapset = {
          artist: "Morimori Atsushi",
          title: "Tits or get the fuck out!!"
        };
        const override1 = validator.findOverride(beatmapset);
        expect(override1).toBeTruthy();
        expect(override1?.resultOverride).toBe("ok");

        beatmapset = {
          artist: "Lusumi",
          title: "/execution_program.wav"
        };
        const override2 = validator.findOverride(beatmapset);
        expect(override2).toBeTruthy();
        expect(override2?.resultOverride).toBe("disallowed");
      });

      it('should not match override with wrong artist', () => {
        const beatmapset = {
          artist: "Morimori Sushi",
          title: "Tits or get the fuck out!!"
        };
        const override = validator.findOverride(beatmapset);
        expect(override).toBeNull();
      });

      it('should not match override with wrong title', () => {
        const beatmapset = {
          artist: "Morimori Atsushi",
          title: "Tits or get the fuck outt!!"
        };
        const override = validator.findOverride(beatmapset);
        expect(override).toBeNull();
      });

      it('should match override with contains', () => {
        const beatmapset = {
          artist: "Lusumi",
          title: "Something /execution_program.wav Something"
        };
        const override = validator.findOverride(beatmapset);
        expect(override).toBeTruthy();
        expect(override?.resultOverride).toBe("disallowed");
      });
    });

    describe('Artist in title', () => {
      it('should flag artist in title - remix', () => {
        const title = "Flower Petal (Igorrr Remix)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe('Igorrr');
        expect(status).toBe('disallowed');
      });

      it('should flag artist in title - feat', () => {
        const title = "Really Long Name (feat. Igorrr)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe('Igorrr');
        expect(status).toBe('disallowed');
      });

      it('should flag artist in title - vs', () => {
        const title = "Song Name (Igorrr vs. Camellia)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe('Igorrr');
        expect(status).toBe('disallowed');
      });

      it('should flag artist in title case-insensitive', () => {
        const title = "Some Song (IgOrRr Remix)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe('Igorrr');
        expect(status).toBe('disallowed');
      });

      it('should not flag normal title', () => {
        const title = "Normal Song Title";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBeNull();
        expect(status).toBeNull();
      });

      it('should not flag partial word match', () => {
        const title = "NOMANOA Remix";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBeNull();
        expect(status).toBeNull();
      });

      it('should flag artist with space in name', () => {
        const title = "Something (Hatsuki Yura Remix)";
        const [artist, status] = validator.getFlaggedArtistInTitle(title);
        expect(artist).toBe('Hatsuki Yura');
        expect(status).toBe('disallowed');
      });

      it('should disallow artist in title', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.title = "Song Name (Igorrr Remix)";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });

      it('should mark FA only artist in title', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.title = "Song Name (Akira Complex Remix)";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
        expect(results[0]!.complianceFailureReason).toBe(ComplianceFailureReason.FA_TRACKS_ONLY);
      });

      it('should allow artist in title when licensed', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.title = "Song Name (Akira Complex Remix)";
        beatmap.beatmapset.track_id = 1234;
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.OK);
      });

      it('should disallow artist in title with feat', () => {
        const beatmap = createNoDmcaGraveyardBeatmap();
        beatmap.beatmapset.title = "Amazing Track (feat. Igorrr)";
        const results = validator.validate([beatmap]);
        expect(results).toHaveLength(1);
        expect(results[0]!.complianceStatus).toBe(ComplianceStatus.DISALLOWED);
      });
    });
  });
});