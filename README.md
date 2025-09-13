# omc-api

The osu! Mappool Compliance API (omc-api) serves as a source of truth for the [OMCC](https://github.com/hburn7/mappool-compliance-checker) and [Tournament Committee website](https://tcomm.hivie.tn/)'s mappool compliance features. For now, this API is restricted to these tools only.

## Endpoints

Validate beatmaps:

(not yet live)

```text
curl -X POST \
-H "X-Api-Key: {secret}" \
--json [123, 456]
{rootUrl}/validate
```

## `data/`

The `data/` folder contains json files which function as rules for the validator. (More info coming soon)

## Tests

An exhaustive test suite can be found in `src/test/validator.test.ts`.

## Usage

Install the latest LTS version of [node](https://nodejs.org/en) if you don't have it.

- `npm i` - Install packages
- `npm run start` - Run the server (listens on `localhost:8080`)
- `vitest` - Run the tests (updates as you code)
