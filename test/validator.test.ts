import { describe, it, expect } from 'vitest';
import * as validator from '../lib/validator.js';
import type { Beatmapset } from '../lib/validator.js';
import { RankStatus } from '../lib/validator.js';

function createNoDmcaRankedBeatmap(): Beatmapset {
  return {
    artist: 'Some cool allowed artist',
    title: 'Some title',
    availability: {
      download_disabled: false,
      more_information: null
    },
    track_id: null,
    status: RankStatus.RANKED
  };
}

function createNoDmcaGraveyardBeatmap(): Beatmapset {
  const beatmapset = createNoDmcaRankedBeatmap();
  beatmapset.status = RankStatus.GRAVEYARD;
  return beatmapset;
}

function createDescription(description: string | null): { description?: string | null } | null {
  if (description) {
    return {
      description: description
    };
  }
  return null;
}

describe('Validator', () => {
  describe('artistFlagged', () => {
    it('should flag known artist', () => {
      const artist = 'Igorrr';
      expect(validator.artistFlagged(artist)).toBe(true);
    });

    it('should flag artist case-insensitive', () => {
      const artist = 'IgOrRr';
      expect(validator.artistFlagged(artist)).toBe(true);
    });

    it('should flag artist in collab', () => {
      const artist = 'igorrr vs. Camellia';
      expect(validator.artistFlagged(artist)).toBe(true);
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
      const beatmapset: Beatmapset = {
        artist: 'Artist',
        title: 'Title',
        availability: {
          download_disabled: true,
          more_information: null
        },
        track_id: null,
        status: RankStatus.RANKED
      };
      expect(validator.isDmca(beatmapset)).toBe(true);
    });

    it('should detect DMCA when more info present', () => {
      const beatmapset: Beatmapset = {
        artist: 'Artist',
        title: 'Title',
        availability: {
          download_disabled: false,
          more_information: 'blah'
        },
        track_id: null,
        status: RankStatus.RANKED
      };
      expect(validator.isDmca(beatmapset)).toBe(true);
    });
  });

  describe('isAllowed', () => {
    it('should allow standard beatmapset', () => {
      const beatmapset = createNoDmcaRankedBeatmap();
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should allow ranked with prohibited artist', () => {
      const beatmapset = createNoDmcaRankedBeatmap();
      beatmapset.artist = 'Igorrr';
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should allow ranked with prohibited artist collab', () => {
      const beatmapset = createNoDmcaRankedBeatmap();
      beatmapset.artist = 'Igorrr vs. Camellia';
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should not allow DMCA beatmapset', () => {
      const beatmapset = createNoDmcaRankedBeatmap();
      beatmapset.availability.download_disabled = true;
      expect(validator.isAllowed(beatmapset)).toBe(false);
    });
  });

  describe('isPartial', () => {
    it('should detect partial artist', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Akira Complex';
      expect(validator.isPartial(beatmapset)).toBe(true);
    });

    it('should detect partial artist collab', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Akira Complex & Hommarju';
      expect(validator.isPartial(beatmapset)).toBe(true);
    });

    it('should allow partial artist with licensed track', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Akira Complex';
      beatmapset.track_id = 1234;
      expect(validator.isPartial(beatmapset)).toBe(false);
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });
  });

  describe('isDisallowed', () => {
    it('should disallow flagged artist', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Igorrr';
      expect(validator.isDisallowed(beatmapset)).toBe(true);
    });

    it('should disallow flagged artist collab', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Igorrr vs. Camellia';
      expect(validator.isDisallowed(beatmapset)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle uma vs. Morimori Atsushi partial', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'uma vs. Morimori Atsushi';
      // Needs to be disallowed because Morimori Atsushi is a prohibited artist
      expect(validator.isPartial(beatmapset)).toBe(true);
    });

    it('should not flag NOMA in NOMANOA', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'nomanoa';
      // Should be allowed because NOMA should not match within NOMANOA
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should not flag NOMA in Tsunomaki Watame', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Tsunomaki Watame';
      // Should be allowed - NOMA should not match within Tsunomaki
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should flag NOMA vs. Someone', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'NOMA vs. Good Artist';
      // Should be disallowed because NOMA is a word boundary match
      expect(validator.isDisallowed(beatmapset)).toBe(true);
    });

    it('should handle various word boundary edge cases', () => {
      // Test 1: Artist name at the beginning
      let beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'NOMA feat. Someone';
      expect(validator.isDisallowed(beatmapset)).toBe(true);

      // Test 2: Artist name at the end
      beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Someone feat. NOMA';
      expect(validator.isDisallowed(beatmapset)).toBe(true);

      // Test 3: Artist name in parentheses
      beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Track (NOMA Remix)';
      expect(validator.isDisallowed(beatmapset)).toBe(true);

      // Test 4: Artist name with punctuation
      beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'NOMA, Someone Else';
      expect(validator.isDisallowed(beatmapset)).toBe(true);

      // Test 5: Partial match should not flag when part of another word
      beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Binomaly'; // Contains "noma" but shouldn't flag
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should disallow space in name', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = 'Hatsuki Yura';
      expect(validator.isDisallowed(beatmapset)).toBe(true);
    });
  });

  describe('Overrides', () => {
    it('should allow override', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = "Morimori Atsushi";
      beatmapset.title = "Tits or get the fuck out!!";
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should disallow override', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = "Lusumi";
      beatmapset.title = "/execution_program.wav";
      expect(validator.isDisallowed(beatmapset)).toBe(true);
    });

    it('should check overrides correctly', () => {
      let beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = "Morimori Atsushi";
      beatmapset.title = "Tits or get the fuck out!!";
      expect(validator.isOverride(beatmapset, "allowed")).toBe(true);

      beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = "Lusumi";
      beatmapset.title = "/execution_program.wav";
      expect(validator.isOverride(beatmapset, "disallowed")).toBe(true);
    });

    it('should not match override with wrong artist', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = "Morimori Sushi";
      beatmapset.title = "Tits or get the fuck out!!";
      expect(validator.isOverride(beatmapset, "allowed")).toBe(false);
    });

    it('should not match override with wrong title', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.artist = "Morimori Atsushi";
      beatmapset.title = "Tits or get the fuck outt!!";
      expect(validator.isOverride(beatmapset, "allowed")).toBe(false);
    });
  });

  describe('Banned sources', () => {
    it('should detect banned sources', () => {
      const beatmapsets = [
        { ...createNoDmcaGraveyardBeatmap(), source: "DJMAX" },
        { ...createNoDmcaGraveyardBeatmap(), source: "DJ MAX" },
        { ...createNoDmcaGraveyardBeatmap(), source: "djmax" },
        { ...createNoDmcaGraveyardBeatmap(), source: "neowiz" },
        { ...createNoDmcaGraveyardBeatmap(), source: "DJMAX Portable 3" }
      ];

      for (const beatmapset of beatmapsets) {
        expect(validator.isDisallowed(beatmapset)).toBe(true);
      }
    });

    it('should allow non-banned source', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.source = "chillierpear";
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should warn for banned source in description', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.source = "chillierpear";
      beatmapset.description = createDescription("this song is from djmax go support the game !!!");
      expect(validator.isPartial(beatmapset)).toBe(true);
    });

    it('should allow beatmapset with none desc', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.source = "chillierpear";
      beatmapset.description = createDescription(null);
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });
  });

  describe('Artist in title', () => {
    it('should flag artist in title - remix', () => {
      const title = "Flower Petal (Igorrr Remix)";
      expect(validator.artistInTitleFlagged(title)).toBe(true);
    });

    it('should flag artist in title - feat', () => {
      const title = "Really Long Name (feat. Igorrr)";
      expect(validator.artistInTitleFlagged(title)).toBe(true);
    });

    it('should flag artist in title - vs', () => {
      const title = "Song Name (Igorrr vs. Camellia)";
      expect(validator.artistInTitleFlagged(title)).toBe(true);
    });

    it('should flag artist in title case-insensitive', () => {
      const title = "Some Song (IgOrRr Remix)";
      expect(validator.artistInTitleFlagged(title)).toBe(true);
    });

    it('should not flag normal title', () => {
      const title = "Normal Song Title";
      expect(validator.artistInTitleFlagged(title)).toBe(false);
    });

    it('should not flag partial word match', () => {
      const title = "NOMANOA Remix";
      expect(validator.artistInTitleFlagged(title)).toBe(false);
    });

    it('should flag artist with space in name', () => {
      const title = "Something (Hatsuki Yura Remix)";
      expect(validator.artistInTitleFlagged(title)).toBe(true);
    });

    it('should disallow artist in title', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.title = "Song Name (Igorrr Remix)";
      expect(validator.isDisallowed(beatmapset)).toBe(true);
    });

    it('should mark partial artist in title', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.title = "Song Name (Akira Complex Remix)";
      expect(validator.isPartial(beatmapset)).toBe(true);
    });

    it('should allow artist in title when licensed', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.title = "Song Name (Akira Complex Remix)";
      beatmapset.track_id = 1234;
      expect(validator.isAllowed(beatmapset)).toBe(true);
    });

    it('should disallow artist in title with feat', () => {
      const beatmapset = createNoDmcaGraveyardBeatmap();
      beatmapset.title = "Amazing Track (feat. Igorrr)";
      expect(validator.isDisallowed(beatmapset)).toBe(true);
    });
  });
});