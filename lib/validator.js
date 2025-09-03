import { readFileSync } from 'fs';
import { join } from 'path';
// Enums
export var RankStatus;
(function (RankStatus) {
    RankStatus[RankStatus["GRAVEYARD"] = -2] = "GRAVEYARD";
    RankStatus[RankStatus["WIP"] = -1] = "WIP";
    RankStatus[RankStatus["PENDING"] = 0] = "PENDING";
    RankStatus[RankStatus["RANKED"] = 1] = "RANKED";
    RankStatus[RankStatus["APPROVED"] = 2] = "APPROVED";
    RankStatus[RankStatus["QUALIFIED"] = 3] = "QUALIFIED";
    RankStatus[RankStatus["LOVED"] = 4] = "LOVED";
})(RankStatus || (RankStatus = {}));
// Constants
const PARTIAL_STATUS = 'partial';
const DISALLOWED_STATUS = 'disallowed';
// Load data files
const dataPath = join(process.cwd(), 'data');
const flaggedArtists = JSON.parse(readFileSync(join(dataPath, 'artists', 'restricted.json'), 'utf-8'));
const overrides = JSON.parse(readFileSync(join(dataPath, 'overrides', 'edge-cases.json'), 'utf-8'));
const bannedSources = JSON.parse(readFileSync(join(dataPath, 'sources', 'banned.json'), 'utf-8'));
export function isBannedSource(beatmapset) {
    if (!beatmapset.source) {
        return false;
    }
    for (const source of bannedSources) {
        if (beatmapset.source.toLowerCase().includes(source.toLowerCase())) {
            return true;
        }
    }
    return false;
}
export function isDmca(beatmapset) {
    return beatmapset.availability.download_disabled ||
        beatmapset.availability.more_information !== null;
}
export function isLicensed(trackId) {
    return trackId !== null && trackId !== undefined;
}
export function isStatusApproved(status) {
    return status === RankStatus.RANKED ||
        status === RankStatus.APPROVED ||
        status === RankStatus.LOVED;
}
export function flagKeyMatch(artist) {
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
    }
    else {
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
export function artistFlagged(artist) {
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
export function artistInTitleFlagged(title) {
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
        }
        else {
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
export function getFlaggedArtistInTitle(title) {
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
        }
        else {
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
export function isOverride(beatmapset, targetStatus) {
    for (const override of overrides) {
        if (override.artist === beatmapset.artist &&
            override.title === beatmapset.title &&
            override.status === targetStatus) {
            return true;
        }
    }
    return false;
}
export function descriptionContainsBannedSource(beatmapset) {
    const desc = beatmapset.description?.description;
    const lowerDesc = desc?.toLowerCase();
    if (!lowerDesc) {
        return false;
    }
    for (const source of bannedSources) {
        if (lowerDesc.includes(source.toLowerCase())) {
            return true;
        }
    }
    return false;
}
export function isPartial(beatmapset) {
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
export function isAllowed(beatmapset) {
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
export function isDisallowed(beatmapset) {
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
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
