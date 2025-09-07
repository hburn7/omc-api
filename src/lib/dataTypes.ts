import type { Beatmap } from 'osu-api-v2-js';

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

export enum ComplianceFailureReason {
  DMCA,
  DISALLOWED_ARTIST,
  DISALLOWED_SOURCE,
  DISALLOWED_BY_RIGHTSHOLDER,
  FA_TRACKS_ONLY
}

// Interfaces
export interface ValidationResult {
  beatmapset_id: number;
  complianceStatus: ComplianceStatus;
  complianceFailureReason?: ComplianceFailureReason;
  notes?: string;
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