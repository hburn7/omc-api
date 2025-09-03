export declare enum RankStatus {
    GRAVEYARD = -2,
    WIP = -1,
    PENDING = 0,
    RANKED = 1,
    APPROVED = 2,
    QUALIFIED = 3,
    LOVED = 4
}
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
    description?: {
        description?: string | null;
    } | null;
}
export interface FlaggedArtistData {
    status: string;
    notes: string | null;
}
export interface Override {
    title: string;
    artist: string;
    status: string;
}
export declare function isBannedSource(beatmapset: Beatmapset): boolean;
export declare function isDmca(beatmapset: Beatmapset): boolean;
export declare function isLicensed(trackId: number | null | undefined): boolean;
export declare function isStatusApproved(status: RankStatus): boolean;
export declare function flagKeyMatch(artist: string): string | null;
export declare function artistFlagged(artist: string): boolean;
export declare function artistInTitleFlagged(title: string): boolean;
export declare function getFlaggedArtistInTitle(title: string): [string | null, string | null];
export declare function isOverride(beatmapset: Beatmapset, targetStatus: string): boolean;
export declare function descriptionContainsBannedSource(beatmapset: Beatmapset): boolean;
export declare function isPartial(beatmapset: Beatmapset): boolean;
export declare function isAllowed(beatmapset: Beatmapset): boolean;
export declare function isDisallowed(beatmapset: Beatmapset): boolean;
//# sourceMappingURL=validator.d.ts.map