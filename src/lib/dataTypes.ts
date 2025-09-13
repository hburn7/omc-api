import type { Beatmap } from 'osu-api-v2-js';

export const RankStatus = {
  GRAVEYARD: -2,
  WIP: -1,
  PENDING: 0,
  RANKED: 1,
  APPROVED: 2,
  QUALIFIED: 3,
  LOVED: 4
} as const;
export type RankStatus = typeof RankStatus[keyof typeof RankStatus];

export const ComplianceStatus = {
  OK: 0,
  POTENTIALLY_DISALLOWED: 1,
  DISALLOWED: 2,
} as const;
export type ComplianceStatus = typeof ComplianceStatus[keyof typeof ComplianceStatus];

export const ComplianceFailureReason = {
  DMCA: 0,
  DISALLOWED_ARTIST: 1,
  DISALLOWED_SOURCE: 2,
  DISALLOWED_BY_RIGHTSHOLDER: 3,
  FA_TRACKS_ONLY: 4
} as const;
export type ComplianceFailureReason = typeof ComplianceFailureReason[keyof typeof ComplianceFailureReason];

// Interfaces
export interface ValidationResult {
  beatmapset_id: number;
  complianceStatus: ComplianceStatus;
  complianceStatusString?: string;
  complianceFailureReason?: ComplianceFailureReason;
  complianceFailureReasonString?: string;
  notes?: string;
  cover?: string;
  artist?: string;
  title?: string;
  owner_id?: number;
  owner_username?: string;
}

export interface Availability {
  download_disabled: boolean;
  more_information: string | null;
}

export interface FlaggedArtistData {
  status: 'fa_only' | 'potential' | 'disallowed' | 'partial';
  notes?: string | null;
}

export interface LabelData {
  [artist: string]: {
    tracks: string[];
  };
}

export interface OverrideMeta {
  title: {
    equalsIgnoreCase?: string;
    contains?: string;
  };
}

export interface Override {
  meta: OverrideMeta;
  artist: string;
  resultOverride: 'ok' | 'potential' | 'disallowed';
  failureReasonOverride?: string;
}

// Re-export Beatmap types for convenience
export type { Beatmap };
export type BeatmapWithBeatmapset = Beatmap.Extended.WithFailtimesOwnersMaxcomboBeatmapset;