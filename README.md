# omc-api

The osu! Mappool Compliance API (omc-api) serves as a source of truth for the [OMCC](https://github.com/hburn7/mappool-compliance-checker) and [Tournament Committee website](https://tcomm.hivie.tn/)'s mappool compliance features. For now, this API is restricted to these tools only. Requests will not be authorized unless the correct value is passed to the `X-Api-Key` header. This secret is stored under the `API_KEY_SECRET` environment variable.

## Rules

The tool relies on hardcoded and file-based rules to function. Rules are checked in order of priority, so if the condition is met, the flow stops immediately. This means that a ranked beatmap with a DMCA flag will always be disallowed. At a high level, the rules are (in order):

1. All beatmapsets which are not downloadable or have a content notice (typically a DMCA notice) are flagged as disallowed due to DMCA.
1. Beatmapsets which match with an [override](https://github.com/hburn7/omc-api/blob/86b189e3a9d476e954b15f2e8495a1fe74243a85/data/overrides/edge-cases.json) are handled.
1. All beatmapsets with a positive `track_id` value are flagged as allowed due to being licensed under the [Featured Artist](https://osu.ppy.sh/beatmaps/artists) program.
1. All ranked/approved/loved beatmapsets are allowed.
1. The beatmapset's tags are checked against the [banned sources list](https://github.com/hburn7/omc-api/blob/master/data/sources/banned.json).
1. The beatmapset's content is checked against [a list](https://github.com/hburn7/omc-api/tree/master/data/labels) of tracks which are prohibited by the rightsholder. Matching prior to parentheses is also checked in case the uploader does not use the exact title (i.e. uploaded under `Flying Castle` instead of the tracked `Flying Castle (Extended Mix)` track).
1. The beatmapset's content is checked against the [list of artists](https://github.com/hburn7/omc-api/blob/master/data/artists/restricted.json) who have restricted use of their content.

## Spec

**Root URL:** `https://api.omc.stagec.net`

### Endpoints

`/validate` (POST)

The `/validate` endpoint accepts an array of osu! beatmap IDs as input and returns an object as follows, where `failures` is a list of osu! beatmap IDs that failed processing (likely due to deletion):

```ts
{
    "results": ValidationResult[],
    "failures": number[]
}
```

#### Example

Request:

```
curl --location 'http://localhost:8080/validate' \
--header 'X-Api-Key: wow' \
--header 'Content-Type: application/json' \
--data '[2895987]'
```

Response:

```
{
    "results": [
        {
            "beatmapIds": [
                2895987
            ],
            "beatmapsetId": 1404115,
            "complianceStatus": 1,
            "complianceStatusString": "POTENTIALLY_DISALLOWED",
            "cover": "https://assets.ppy.sh/beatmaps/1404115/covers/cover.jpg?1622561423",
            "artist": "Frums",
            "title": "memoryfactory.lzh",
            "ownerId": 4903197,
            "ownerUsername": "Bekko",
            "status": "graveyard",
            "notes": "Refer to Frums' [non-commercial use requirements](https://docs.google.com/spreadsheets/d/1_M0BqHSrbE1HOF0uhKX5ebVCvWnqlx0qz_wIEZzSFG0/edit?gid=0#gid=0) for songs not included in their Featured Artist listing."
        }
    ],
    "failures": []
}
```

`/validate-metadata` (POST)

The `/validate-metadata` endpoint accepts an array of raw metadata objects and returns compliance results without requiring osu! beatmap IDs. This is useful for validating artist/title combinations directly.

Each object requires `artist` and `title` fields. Optional fields: `isFeaturedArtist` (boolean), `status` (string), `source` (string), `tags` (string). Maximum 1000 items per request.

```ts
RawValidationResult[]
```

#### Example

Request:

```
curl --location 'http://localhost:8080/validate-metadata' \
--header 'X-Api-Key: wow' \
--header 'Content-Type: application/json' \
--data '[{"artist": "Frums", "title": "memoryfactory.lzh"}]'
```

Response:

```
[
    {
        "complianceStatus": 1,
        "complianceStatusString": "POTENTIALLY_DISALLOWED",
        "artist": "Frums",
        "title": "memoryfactory.lzh",
        "notes": "Refer to Frums' [non-commercial use requirements](https://docs.google.com/spreadsheets/d/1_M0BqHSrbE1HOF0uhKX5ebVCvWnqlx0qz_wIEZzSFG0/edit?gid=0#gid=0) for songs not included in their Featured Artist listing."
    }
]
```

### Types

[`ValidationResult`](https://github.com/hburn7/omc-api/blob/86b189e3a9d476e954b15f2e8495a1fe74243a85/src/lib/dataTypes.ts#L33): Information about the beatmapset which was processed, including all osu! beatmap IDs from the `POST` body which belong to the set.

[`RawValidationResult`](https://github.com/hburn7/omc-api/blob/master/src/lib/dataTypes.ts#L81): Compliance result for a raw artist/title input, without beatmapset-specific fields.

## Usage

Copy the `.env.example` file and replace the `OSU_CLIENT_ID` and `OSU_CLIENT_SECRET` values with your [osu! api v2](https://osu.ppy.sh/docs/index.html) client. You can create a client under your osu! account's [settings page](https://osu.ppy.sh/home/account/edit).

Install [bun](https://bun.sh/docs/installation).

- `bun install --frozen-lockfile` - Installs packages
- `bun run start` - Runs the server (listens on `localhost:8080`)
- `bun run test` - Starts tests using `vitest`

## Logging

Structured JSON logs are emitted at `DEBUG`, `INFO`, `WARN`, and `ERROR` levels. Configure the minimum level with the `LOG_LEVEL` environment variable in your `.env` file (defaults to `DEBUG`).
