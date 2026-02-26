import argparse
import json
import unicodedata
from pathlib import Path
from enum import Enum


class DataFormat(Enum):
    ARTIST_TITLE_GRP = 0  # [{'artist': '', 'title': ''}]
    ARTIST_TRACK_LIST_WITH_KEY = 1  # {"Artist": {"tracks": ['']}}
    ARTIST_TRACK_LIST = 2  # {"Artist": ['']}


def _nfkc(s: str) -> str:
    return unicodedata.normalize("NFKC", s)


def _parse_artist_title_grp(data: list) -> dict[str, list[str]]:
    collection: dict[str, list[str]] = {}
    for item in data:
        artist = _nfkc(item["artist"])
        title = _nfkc(item["title"])
        if artist in collection:
            collection[artist].append(title)
        else:
            collection[artist] = [title]
    return collection


def _parse_artist_track_list_with_key(data: dict) -> dict[str, list[str]]:
    collection: dict[str, list[str]] = {}
    for artist, info in data.items():
        normalized_artist = _nfkc(artist)
        tracks = [_nfkc(t) for t in info["tracks"]]
        if normalized_artist in collection:
            collection[normalized_artist].extend(tracks)
        else:
            collection[normalized_artist] = tracks
    return collection


def _parse_artist_track_list(data: dict) -> dict[str, list[str]]:
    collection: dict[str, list[str]] = {}
    for artist, tracks in data.items():
        normalized_artist = _nfkc(artist)
        normalized_tracks = [_nfkc(t) for t in tracks]
        if normalized_artist in collection:
            collection[normalized_artist].extend(normalized_tracks)
        else:
            collection[normalized_artist] = normalized_tracks
    return collection


def _to_artist_title_grp(collection: dict[str, list[str]]) -> list[dict[str, str]]:
    result = []
    for artist, tracks in collection.items():
        for title in tracks:
            result.append({"artist": artist, "title": title})
    return result


def _to_artist_track_list_with_key(collection: dict[str, list[str]]) -> dict[str, dict[str, list[str]]]:
    return {artist: {"tracks": tracks} for artist, tracks in collection.items()}


def _to_artist_track_list(collection: dict[str, list[str]]) -> dict[str, list[str]]:
    return dict(collection)


_PARSERS = {
    DataFormat.ARTIST_TITLE_GRP: _parse_artist_title_grp,
    DataFormat.ARTIST_TRACK_LIST_WITH_KEY: _parse_artist_track_list_with_key,
    DataFormat.ARTIST_TRACK_LIST: _parse_artist_track_list,
}

_SERIALIZERS = {
    DataFormat.ARTIST_TITLE_GRP: _to_artist_title_grp,
    DataFormat.ARTIST_TRACK_LIST_WITH_KEY: _to_artist_track_list_with_key,
    DataFormat.ARTIST_TRACK_LIST: _to_artist_track_list,
}


def convert(data_path: Path | str, save_path: Path | str, input_format: DataFormat, output_format: DataFormat):
    with open(data_path, "r") as f:
        data = json.load(f)

    collection = _PARSERS[input_format](data)
    output = _SERIALIZERS[output_format](collection)

    with open(save_path, "w") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print("Done")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Convert between omc-api data formats with NFKC normalization")
    parser.add_argument("-i", "--input", required=True, help="Input file path")
    parser.add_argument("-o", "--output", required=True, help="Output file path")
    parser.add_argument("-if", "--input-format", dest="input_format", type=int, required=True, choices=[0, 1, 2],
                        help="Input format (0=artist/title groups, 1=artist track list with key, 2=artist track list)")
    parser.add_argument("-of", "--output-format", dest="output_format", type=int, required=True, choices=[0, 1, 2],
                        help="Output format (0=artist/title groups, 1=artist track list with key, 2=artist track list)")
    args = parser.parse_args()

    convert(args.input, args.output, DataFormat(args.input_format), DataFormat(args.output_format))
