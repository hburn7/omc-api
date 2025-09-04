import { readFileSync } from 'fs';
import type { Beatmap } from 'osu-api-v2-js';
import { join } from 'path';
import type { b } from 'vitest/dist/chunks/suite.d.FvehnV49.js';

// Enums
export enum RankStatus {
  GRAVEYARD = -2,
  WIP = -1,
  PENDING = 0,
  RANKED = 1,
  APPROVED = 2,
  QUALIFIED = 3,
  LOVED = 4
}

export enum ComplianceStatus {
  OK = 0,
  POTENTIALLY_DISALLOWED = 1,
  DISALLOWED = 2,
}

export enum ComplianceFailureReasons {
  DMCA,
  DISALLOWED_ARTIST,
  DISALLOWED_SOURCE,
  DISALLOWED_BY_RIGHTSHOLDER,
  FA_TRACKS_ONLY
}

export interface ValidationResult {
  beatmap: Beatmap;
  complianceStatus: ComplianceStatus;
  reason: string | undefined;
}

// Interfaces
export interface Availability {
  download_disabled: boolean;
  more_information: string | null;
}

export interface Beatmapset {
  artist: string;
  title: string;
  source?: string | null;
  track_id?: number | null;
  status: RankStatus;
  availability: Availability;
  description?: { description?: string | null } | null;
}

export interface FlaggedArtistData {
  status: string; // Either 'partial' or 'disallowed'
  notes: string | null;
}

interface OverrideMeta {
  title: {
    equalsIgnoreCase: string | undefined;
    contains: string | undefined;
  }
}

export interface Override {
  meta: OverrideMeta;
  artist: string;
  /**
   * Special string which forces the listed status if the conditions are met.
   * Options are: 'ok', 'potential', 'disallowed'
   */
  resultOverride: string;
  /**
   * Special string which overrides the complianceFailureReason.
   * Options are: 'disallowedByRightsholder'
   */
  failureReasonOverride: string | undefined;
}

export function getStatuses(beatmaps: Beatmap[]) {
  const statuses = [];
  
  beatmaps.forEach(b => {
    statuses.push(validate(b))
  });

  return statuses;
}

export function validate(beatmapset: Beatmapset): ValidationResult {
  return {
    beatmap: beatmap,
    complianceStatus
  }
}

export function getStatus(beatmapset: Beatmapset) {
  beatmap.
}

// Constants
const PARTIAL_STATUS = 'partial';
const DISALLOWED_STATUS = 'disallowed';

// Load data files
const dataPath = join(process.cwd(), 'data');
const flaggedArtists: Record<string, FlaggedArtistData> = JSON.parse(
  readFileSync(join(dataPath, 'artists', 'restricted.json'), 'utf-8')
);
const overrides: Override[] = JSON.parse(
  readFileSync(join(dataPath, 'overrides', 'edge-cases.json'), 'utf-8')
);
const disallowedSources: string[] = JSON.parse(
  readFileSync(join(dataPath, 'sources', 'banned.json'), 'utf-8')
);

export function parseResult(status: string) {
  switch(status) {
    case "ok":
      return 
  }
}

export function isBannedSource(beatmapset: Beatmapset): boolean {
  if (!beatmapset.source) {
    return false;
  }

  for (const source of disallowedSources) {
    if (beatmapset.source.toLowerCase().includes(source.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function isDmca(beatmapset: Beatmapset): boolean {
  return beatmapset.availability.download_disabled ||
    beatmapset.availability.more_information !== null;
}

export function isLicensed(trackId: number | null | undefined): boolean {
  return trackId !== null && trackId !== undefined;
}

export function isStatusApproved(status: RankStatus): boolean {
  return status === RankStatus.RANKED ||
    status === RankStatus.APPROVED ||
    status === RankStatus.LOVED;
}

export function flagKeyMatch(artist: string): string | null {
  const keys = Object.keys(flaggedArtists);

  if (artist.includes(' ')) {
    // We have a space in the artist's name, check for word boundaries
    // This handles cases like "Igorrr vs. Camellia" or "Artist feat. Another"
    for (const key of keys) {
      // Use word boundary regex to avoid false positives
      const pattern = new RegExp(`\\b${escapeRegex(key.toLowerCase())}\\b`);
      if (pattern.test(artist.toLowerCase())) {
        return key;
      }
    }
  } else {
    // No space in the artist's name, look for an exact match
    // We do this to avoid these kinds of edge cases:
    // (NOMA -> nomanoma) https://osu.ppy.sh/beatmapsets/2062097#osu/4311526
    for (const key of keys) {
      if (key.toLowerCase() === artist.toLowerCase()) {
        return key;
      }
    }
  }

  return null;
}

export function artistFlagged(artist: string): boolean {
  // exact match
  if (artist in flaggedArtists) {
    return true;
  }

  // lower case match
  const lowerArtist = artist.toLowerCase();
  const lowerKeys = Object.keys(flaggedArtists).map(k => k.toLowerCase());
  if (lowerKeys.includes(lowerArtist)) {
    return true;
  }

  return flagKeyMatch(artist) !== null;
}

export function artistInTitleFlagged(title: string): boolean {
  if (!title) {
    return false;
  }

  const lowerTitle = title.toLowerCase();

  for (const artist of Object.keys(flaggedArtists)) {
    const lowerArtist = artist.toLowerCase();

    // For artists with spaces in their name, do a simple substring match
    if (artist.includes(' ')) {
      if (lowerTitle.includes(lowerArtist)) {
        return true;
      }
    } else {
      // For single-word artists, ensure word boundaries to avoid false positives
      // Word boundary pattern - artist must be a complete word
      const pattern = new RegExp(`\\b${escapeRegex(lowerArtist)}\\b`);
      if (pattern.test(lowerTitle)) {
        return true;
      }
    }
  }

  return false;
}

export function getFlaggedArtistInTitle(title: string): [string | null, string | null] {
  if (!title) {
    return [null, null];
  }

  const lowerTitle = title.toLowerCase();

  for (const artist of Object.keys(flaggedArtists)) {
    const lowerArtist = artist.toLowerCase();
    let found = false;

    // For artists with spaces in their name, do a simple substring match
    if (artist.includes(' ')) {
      if (lowerTitle.includes(lowerArtist)) {
        found = true;
      }
    } else {
      // For single-word artists, ensure word boundaries to avoid false positives
      const pattern = new RegExp(`\\b${escapeRegex(lowerArtist)}\\b`);
      if (pattern.test(lowerTitle)) {
        found = true;
      }
    }

    if (found && artist in flaggedArtists) {
      const flaggedArtist = flaggedArtists[artist];
      if (flaggedArtist) {
        return [artist, flaggedArtist.status];
      }
    }
  }

  return [null, null];
}

export function isOverride(beatmapset: Beatmapset, targetStatus: string): boolean {
  for (const override of overrides) {
    if (override.artist === beatmapset.artist && 
        override.title === beatmapset.title && 
        override.status === targetStatus) {
      return true;
    }
  }

  return false;
}

export function descriptionContainsBannedSource(beatmapset: Beatmapset): boolean {
  const desc = beatmapset.description?.description;
  const lowerDesc = desc?.toLowerCase();
  
  if (!lowerDesc) {
    return false;
  }

  for (const source of disallowedSources) {
    if (lowerDesc.includes(source.toLowerCase())) {
      return true;
    }
  }

  return false;
}

export function isPartial(beatmapset: Beatmapset): boolean {
  if (isOverride(beatmapset, "partial")) {
    return true;
  }

  if (descriptionContainsBannedSource(beatmapset)) {
    return true;
  }

  if (isAllowed(beatmapset)) {
    return false;
  }

  // Check if artist is flagged in the artist field
  const artist = beatmapset.artist;
  let artistFieldPartial = false;

  if (artistFlagged(artist)) {
    const key = flagKeyMatch(artist);
    if (key !== null && key in flaggedArtists) {
      const flaggedArtist = flaggedArtists[key];
      if (flaggedArtist) {
        artistFieldPartial = flaggedArtist.status === PARTIAL_STATUS;
      }
    }
  }

  // Check if artist is flagged in the title field
  const [titleArtist, titleStatus] = getFlaggedArtistInTitle(beatmapset.title);
  const titleFieldPartial = titleArtist !== null && titleStatus === PARTIAL_STATUS;

  return artistFieldPartial || titleFieldPartial;
}

export function isAllowed(beatmapset: Beatmapset): boolean {
  if (isDmca(beatmapset)) {
    return false;
  }

  if (isLicensed(beatmapset.track_id) || isStatusApproved(beatmapset.status)) {
    return true;
  }

  if (isOverride(beatmapset, "allowed")) {
    return true;
  }

  if (isBannedSource(beatmapset)) {
    return false;
  }

  if (descriptionContainsBannedSource(beatmapset)) {
    return false;
  }

  // Check both artist field and title field for flagged artists
  if (artistFlagged(beatmapset.artist)) {
    return false;
  }

  if (artistInTitleFlagged(beatmapset.title)) {
    return false;
  }

  return true;
}

export function isDisallowed(beatmapset: Beatmapset): boolean {
  if (isOverride(beatmapset, "disallowed")) {
    return true;
  }

  if (isBannedSource(beatmapset)) {
    return true;
  }

  if (isAllowed(beatmapset)) {
    return false;
  }

  // Check if artist is flagged in the artist field
  let artistFieldDisallowed = false;
  if (artistFlagged(beatmapset.artist)) {
    const key = flagKeyMatch(beatmapset.artist);
    if (key !== null && key in flaggedArtists) {
      const flaggedArtist = flaggedArtists[key];
      if (flaggedArtist) {
        artistFieldDisallowed = flaggedArtist.status === DISALLOWED_STATUS;
      }
    }
  }

  // Check if artist is flagged in the title field
  const [titleArtist, titleStatus] = getFlaggedArtistInTitle(beatmapset.title);
  const titleFieldDisallowed = titleArtist !== null && titleStatus === DISALLOWED_STATUS;

  return artistFieldDisallowed || titleFieldDisallowed;
}

// Helper function to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}