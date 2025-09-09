import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  RankStatus,
  ComplianceStatus,
  ComplianceFailureReason,
  type FlaggedArtistData,
  type BeatmapWithBeatmapset,
  type LabelData,
  type Override,
  type ValidationResult
} from './dataTypes.ts';
import type { Beatmapset } from 'osu-api-v2-js';


// Constants
const PARTIAL_STATUS = 'partial';
const DISALLOWED_STATUS = 'disallowed';
const FA_ONLY_STATUS = 'fa_only';
const POTENTIAL_STATUS = 'potential';

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

// Load all label files
const labelsPath = join(dataPath, 'labels');
const labelFiles = readdirSync(labelsPath).filter(file => file.endsWith('.json'));
const labels: LabelData[] = labelFiles.map(file => {
  const content = readFileSync(join(labelsPath, file), 'utf-8');
  if (!content || content.trim() === '') {
    return {};
  }
  return JSON.parse(content);
});

// Main validation function - accepts array of beatmaps and returns one result per unique beatmapset
export function validate(beatmaps: BeatmapWithBeatmapset[]): ValidationResult[] {
  const beatmapsetMap = new Map<number, BeatmapWithBeatmapset[]>();
  
  // Group beatmaps by beatmapset_id
  for (const beatmap of beatmaps) {
    const beatmapsetId = beatmap.beatmapset_id;
    if (!beatmapsetMap.has(beatmapsetId)) {
      beatmapsetMap.set(beatmapsetId, []);
    }
    beatmapsetMap.get(beatmapsetId)!.push(beatmap);
  }
  
  const results: ValidationResult[] = [];
  
  // Validate each unique beatmapset
  for (const [beatmapsetId, beatmapGroup] of beatmapsetMap) {
    // Use the first beatmap's beatmapset data (they all share the same beatmapset)
    const beatmapset = beatmapGroup[0]?.beatmapset;
    if (!beatmapset) continue;
    const result = validateBeatmapset(beatmapsetId, beatmapset);
    results.push(result);
  }
  
  return results;
}

// Validate a single beatmapset
function validateBeatmapset(beatmapsetId: number, beatmapset: any): ValidationResult {
  // Check for DMCA
  if (isDmca(beatmapset)) {
    return {
      beatmapset_id: beatmapsetId,
      complianceStatus: ComplianceStatus.DISALLOWED,
      complianceFailureReason: ComplianceFailureReason.DMCA,
      notes: "This beatmapset has been taken down due to a DMCA request."
    };
  }
  
  // Check for overrides first
  const override = findOverride(beatmapset);
  if (override) {
    const status = parseOverrideStatus(override.resultOverride);
    if (status === ComplianceStatus.OK) {
      return {
        beatmapset_id: beatmapsetId,
        complianceStatus: ComplianceStatus.OK
      };
    }
    
    const failureReason = parseFailureReason(override.failureReasonOverride);
    const notes = getNotesForReason(failureReason);
    const result: ValidationResult = {
      beatmapset_id: beatmapsetId,
      complianceStatus: status
    };
    if (failureReason !== undefined) {
      result.complianceFailureReason = failureReason;
    }
    if (notes !== undefined) {
      result.notes = notes;
    }
    return result;
  }
  
  // Check if licensed or approved
  if (isLicensed(beatmapset.track_id) || isStatusApproved(getRankStatus(beatmapset.status))) {
    return {
      beatmapset_id: beatmapsetId,
      complianceStatus: ComplianceStatus.OK
    };
  }
  
  // Check for banned sources in tags
  if (tagContainsBannedSource(beatmapset)) {
    return {
      beatmapset_id: beatmapsetId,
      complianceStatus: ComplianceStatus.DISALLOWED,
      complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
      notes: "This beatmapset contains a banned source."
    };
  }
  
  // Check for banned sources in source field
  if (isBannedSource(beatmapset)) {
    return {
      beatmapset_id: beatmapsetId,
      complianceStatus: ComplianceStatus.DISALLOWED,
      complianceFailureReason: ComplianceFailureReason.DISALLOWED_SOURCE,
      notes: "This beatmapset contains a banned source."
    };
  }
  
  // Check for label violations
  if (isLabelViolation(beatmapset)) {
    return {
      beatmapset_id: beatmapsetId,
      complianceStatus: ComplianceStatus.DISALLOWED,
      complianceFailureReason: ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER,
      notes: "This beatmapset has been disallowed by the rightsholder."
    };
  }
  
  // Check for flagged artists
  const artistResult = checkFlaggedArtist(beatmapset);
  if (artistResult) {
    return artistResult;
  }
  
  // Check for flagged artists in title
  const titleResult = checkFlaggedArtistInTitle(beatmapset, beatmapsetId);
  if (titleResult) {
    return titleResult;
  }
  
  // Default to OK
  return {
    beatmapset_id: beatmapsetId,
    complianceStatus: ComplianceStatus.OK
  };
}

// Helper functions

function isDmca(beatmapset: any): boolean {
  return beatmapset.availability.download_disabled ||
    beatmapset.availability.more_information !== null;
}

function isLicensed(trackId: number | null | undefined): boolean {
  return trackId !== null && trackId !== undefined && trackId > 0;
}

function isStatusApproved(status: RankStatus): boolean {
  return status === RankStatus.RANKED ||
    status === RankStatus.APPROVED ||
    status === RankStatus.LOVED;
}

function getRankStatus(status: string): RankStatus {
  switch (status) {
    case 'graveyard': return RankStatus.GRAVEYARD;
    case 'wip': return RankStatus.WIP;
    case 'pending': return RankStatus.PENDING;
    case 'ranked': return RankStatus.RANKED;
    case 'approved': return RankStatus.APPROVED;
    case 'qualified': return RankStatus.QUALIFIED;
    case 'loved': return RankStatus.LOVED;
    default: return RankStatus.GRAVEYARD;
  }
}

function isBannedSource(beatmapset: any): boolean {
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

function tagContainsBannedSource(beatmapset: any): boolean {
  if (!beatmapset.tags || !Array.isArray(beatmapset.tags)) {
    return false;
  }

  const tagsString = beatmapset.tags.join(' ').toLowerCase();
  
  for (const source of disallowedSources) {
    if (tagsString.includes(source.toLowerCase())) {
      return true;
    }
  }

  return false;
}

function isLabelViolation(beatmapset: any): boolean {
  const artist = beatmapset.artist.toLowerCase();
  const title = beatmapset.title.toLowerCase();
  
  for (const labelData of labels) {
    for (const [labelArtist, data] of Object.entries(labelData)) {
      // Check if artist matches
      if (labelArtist.toLowerCase() === artist) {
        // Check if title matches any tracks
        for (const track of data.tracks) {
          if (title.includes(track.toLowerCase())) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

function findOverride(beatmapset: any): Override | null {
  for (const override of overrides) {
    if (matchesOverride(beatmapset, override)) {
      return override;
    }
  }
  return null;
}

function matchesOverride(beatmapset: any, override: Override): boolean {
  // Check artist match
  if (override.artist !== beatmapset.artist) {
    return false;
  }
  
  // Check title conditions
  if (override.meta.title.equalsIgnoreCase) {
    return beatmapset.title.toLowerCase() === 
           override.meta.title.equalsIgnoreCase.toLowerCase();
  }
  
  if (override.meta.title.contains) {
    return beatmapset.title.toLowerCase().includes(
           override.meta.title.contains.toLowerCase()
    );
  }
  
  return false;
}

function parseOverrideStatus(status: string): ComplianceStatus {
  switch (status) {
    case 'ok': return ComplianceStatus.OK;
    case 'potential': return ComplianceStatus.POTENTIALLY_DISALLOWED;
    case 'disallowed': return ComplianceStatus.DISALLOWED;
    default: return ComplianceStatus.OK;
  }
}

function parseFailureReason(reason: string | undefined): ComplianceFailureReason | undefined {
  if (!reason) return undefined;
  
  switch (reason) {
    case 'disallowedByRightsholder': return ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER;
    default: return undefined;
  }
}

function checkFlaggedArtist(beatmapset: Beatmapset): ValidationResult | null {
  const artist = beatmapset.artist;
  const key = flagKeyMatch(artist);
  
  if (key && key in flaggedArtists) {
    const flaggedArtist = flaggedArtists[key];
    if (!flaggedArtist) return null;
    
    switch (flaggedArtist.status) {
      case FA_ONLY_STATUS:
        if (!isLicensed(beatmapset.track_id)) {
          return {
            beatmapset_id: beatmapset.id,
            complianceStatus: ComplianceStatus.DISALLOWED,
            complianceFailureReason: ComplianceFailureReason.FA_TRACKS_ONLY,
            notes: flaggedArtist?.notes || "Do not use or upload tracks that are not available on the creator's Featured Artist listing."
          };
        }
        break;
      case POTENTIAL_STATUS: {
        const result: ValidationResult = {
          beatmapset_id: beatmapset.id,
          complianceStatus: ComplianceStatus.POTENTIALLY_DISALLOWED
        };
        if (flaggedArtist?.notes) {
          result.notes = flaggedArtist.notes;
        }
        return result;
      }
      case DISALLOWED_STATUS: {
        const result: ValidationResult = {
          beatmapset_id: beatmapset.id,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_ARTIST
        };
        if (flaggedArtist?.notes) {
          result.notes = flaggedArtist.notes;
        }
        return result;
      }
    }
  }
  
  return null;
}

function checkFlaggedArtistInTitle(beatmapset: any, beatmapsetId: number): ValidationResult | null {
  const [titleArtist, titleStatus] = getFlaggedArtistInTitle(beatmapset.title);
  
  if (titleArtist && titleStatus) {
    const flaggedArtist = flaggedArtists[titleArtist];
    
    switch (titleStatus) {
      case FA_ONLY_STATUS:
        if (!isLicensed(beatmapset.track_id)) {
          return {
            beatmapset_id: beatmapsetId,
            complianceStatus: ComplianceStatus.DISALLOWED,
            complianceFailureReason: ComplianceFailureReason.FA_TRACKS_ONLY,
            notes: flaggedArtist?.notes || "Do not use or upload tracks that are not available on the creator's Featured Artist listing."
          };
        }
        break;
      case POTENTIAL_STATUS: {
        const result: ValidationResult = {
          beatmapset_id: beatmapsetId,
          complianceStatus: ComplianceStatus.POTENTIALLY_DISALLOWED
        };
        if (flaggedArtist?.notes) {
          result.notes = flaggedArtist.notes;
        }
        return result;
      }
      case DISALLOWED_STATUS: {
        const result: ValidationResult = {
          beatmapset_id: beatmapsetId,
          complianceStatus: ComplianceStatus.DISALLOWED,
          complianceFailureReason: ComplianceFailureReason.DISALLOWED_ARTIST
        };
        if (flaggedArtist?.notes) {
          result.notes = flaggedArtist.notes;
        }
        return result;
      }
    }
  }
  
  return null;
}

function flagKeyMatch(artist: string): string | null {
  const keys = Object.keys(flaggedArtists);

  if (artist.includes(' ')) {
    // We have a space in the artist's name, check for word boundaries
    for (const key of keys) {
      const pattern = new RegExp(`\\b${escapeRegex(key.toLowerCase())}\\b`);
      if (pattern.test(artist.toLowerCase())) {
        return key;
      }
    }
  } else {
    // No space in the artist's name, look for an exact match
    for (const key of keys) {
      if (key.toLowerCase() === artist.toLowerCase()) {
        return key;
      }
    }
  }

  return null;
}

function getFlaggedArtistInTitle(title: string): [string | null, string | null] {
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

function getNotesForReason(reason: ComplianceFailureReason | undefined): string | undefined {
  if (reason === undefined) return undefined;
  
  switch (reason) {
    case ComplianceFailureReason.DMCA:
      return "This beatmapset has been taken down due to a DMCA request.";
    case ComplianceFailureReason.DISALLOWED_ARTIST:
      return "This artist has been disallowed from use.";
    case ComplianceFailureReason.DISALLOWED_SOURCE:
      return "This beatmapset contains a banned source.";
    case ComplianceFailureReason.DISALLOWED_BY_RIGHTSHOLDER:
      return "This beatmapset has been disallowed by the rightsholder.";
    case ComplianceFailureReason.FA_TRACKS_ONLY:
      return "Do not use or upload tracks that are not available on the creator's Featured Artist listing.";
    default:
      return undefined;
  }
}

// Helper function to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export functions for testing
export {
  isDmca,
  isLicensed,
  isStatusApproved,
  isBannedSource,
  tagContainsBannedSource,
  isLabelViolation,
  findOverride,
  matchesOverride,
  flagKeyMatch,
  getFlaggedArtistInTitle,
  checkFlaggedArtist,
  checkFlaggedArtistInTitle
};