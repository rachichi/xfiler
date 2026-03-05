#!/usr/bin/env python3
"""
Portable backend for the Unfiled Photos gallery.

Drop the `gallery/` folder into any Google Photos Takeout directory and run:
    python3 gallery/server.py

Auto-detects the 'Photos from XXXX' folder and album folders in the parent.
"""

import json
import os
import re
import shutil
import subprocess
import sys
import mimetypes
import threading
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

GALLERY_DIR = Path(__file__).resolve().parent
TAKEOUT_DIR = GALLERY_DIR.parent
TRASH_DIR = Path.home() / ".Trash"

MEDIA_EXTENSIONS = {
    ".jpg", ".jpeg", ".png", ".heic", ".webp", ".gif", ".bmp", ".tiff",
    ".mov", ".mp4", ".avi", ".mkv", ".webm", ".m4v",
}
VIDEO_EXTENSIONS = {".mov", ".mp4", ".avi", ".mkv", ".webm", ".m4v"}

mimetypes.add_type("image/heic", ".heic")
mimetypes.add_type("image/heic", ".HEIC")

PHOTOS_FROM_RE = re.compile(r"^Photos from (\d{4})$")
SKIP_DIRS = {"xfiler", "gallery", "__pycache__", ".git", "node_modules"}

photos_dir: Path = Path()
detected_year: str = ""
unfiled_cache: list[dict] = []

convert_lock = threading.Lock()
convert_status: dict = {"running": False, "done": 0, "total": 0, "errors": []}


def detect_photos_folder() -> tuple[Path, str]:
    candidates = []
    for entry in TAKEOUT_DIR.iterdir():
        if entry.is_dir():
            m = PHOTOS_FROM_RE.match(entry.name)
            if m:
                candidates.append((entry, m.group(1)))

    if not candidates:
        print(f"Error: No 'Photos from XXXX' folder found in {TAKEOUT_DIR}")
        print("Make sure the gallery/ folder is placed inside your Google Photos takeout directory.")
        sys.exit(1)

    if len(candidates) > 1:
        candidates.sort(key=lambda c: c[1], reverse=True)
        print(f"Found multiple Photos folders: {[c[0].name for c in candidates]}")
        print(f"Using most recent: {candidates[0][0].name}")

    return candidates[0]


def get_album_dirs() -> list[Path]:
    albums = []
    for entry in TAKEOUT_DIR.iterdir():
        if not entry.is_dir():
            continue
        if entry.name in SKIP_DIRS:
            continue
        if PHOTOS_FROM_RE.match(entry.name):
            continue
        albums.append(entry)
    return sorted(albums, key=lambda d: d.name)


def parse_json_metadata(json_path: Path) -> tuple[str | None, int | None]:
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        title = data.get("title", "")
        taken_ts = None
        if "photoTakenTime" in data and "timestamp" in data["photoTakenTime"]:
            taken_ts = int(data["photoTakenTime"]["timestamp"])
        elif "creationTime" in data and "timestamp" in data["creationTime"]:
            taken_ts = int(data["creationTime"]["timestamp"])
        return title, taken_ts
    except (json.JSONDecodeError, KeyError, ValueError, OSError):
        return None, None


def find_json_for_media(media_path: Path) -> Path | None:
    candidates = [
        media_path.parent / (media_path.name + ".supplemental-metadata.json"),
        media_path.parent / (media_path.name + ".supp.json"),
        media_path.parent / (media_path.name + "..json"),
        media_path.parent / (media_path.name + ".json"),
        media_path.parent / (media_path.stem + ".json"),
    ]
    for c in candidates:
        if c.exists():
            return c
    prefix = media_path.name[:20]
    for f in media_path.parent.iterdir():
        if f.suffix == ".json" and f.name.startswith(prefix):
            return f
    return None


def move_to_trash(filepath: Path) -> None:
    dest = TRASH_DIR / filepath.name
    if dest.exists():
        stem, suffix = dest.stem, dest.suffix
        counter = 1
        while dest.exists():
            dest = TRASH_DIR / f"{stem} ({counter}){suffix}"
            counter += 1
    shutil.move(str(filepath), str(dest))


def index_folder(folder_path: Path) -> dict[str, tuple[str, int | None, Path | None]]:
    entries: dict[str, tuple[str, int | None, Path | None]] = {}
    json_titles: set[str] = set()
    for f in folder_path.iterdir():
        if f.suffix.lower() == ".json":
            title, ts = parse_json_metadata(f)
            if title:
                json_titles.add(title.lower())
            continue
        if f.suffix.lower() not in MEDIA_EXTENSIONS:
            continue
        json_path = find_json_for_media(f)
        title = f.name
        taken_ts = None
        if json_path:
            j_title, j_ts = parse_json_metadata(json_path)
            if j_title:
                title = j_title
            if j_ts:
                taken_ts = j_ts
        key = title.lower()
        entries[key] = (title, taken_ts, f)
    for t in json_titles:
        if t not in entries:
            entries[t] = (t, None, None)
    return entries


def build_index() -> list[dict]:
    global unfiled_cache

    print(f"Indexing '{photos_dir.name}'...")
    photos_all = index_folder(photos_dir)
    print(f"  Found {len(photos_all)} items")

    album_titles: set[str] = set()
    album_dirs = get_album_dirs()
    print(f"Indexing {len(album_dirs)} album folders...")
    for album_dir in album_dirs:
        album_entries = index_folder(album_dir)
        album_titles.update(album_entries.keys())
        print(f"  {album_dir.name}: {len(album_entries)} items")
    print(f"Unique titles across albums: {len(album_titles)}")

    unfiled = []
    for key, (title, taken_ts, media_path) in photos_all.items():
        if key not in album_titles and media_path is not None:
            ext = media_path.suffix.lower()
            unfiled.append({
                "id": media_path.name,
                "title": title,
                "timestamp": taken_ts or 0,
                "filename": media_path.name,
                "isVideo": ext in VIDEO_EXTENSIONS,
            })
    unfiled.sort(key=lambda x: x["timestamp"])
    unfiled_cache = unfiled
    print(f"Unfiled: {len(unfiled)}")
    return unfiled


def remove_from_cache(filenames: set[str]) -> None:
    global unfiled_cache
    unfiled_cache = [p for p in unfiled_cache if p["filename"] not in filenames]


def convert_single_heic(heic_path: Path) -> Path:
    """Convert a single HEIC file to JPG using macOS sips. Returns new JPG path."""
    jpg_name = heic_path.stem + ".jpg"
    jpg_path = heic_path.parent / jpg_name
    result = subprocess.run(
        ["sips", "-s", "format", "jpeg", str(heic_path), "--out", str(jpg_path)],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        raise RuntimeError(f"sips failed: {result.stderr.strip()}")
    return jpg_path


def update_json_for_conversion(heic_path: Path, jpg_path: Path) -> None:
    """Rename the JSON sidecar and update the title field inside it."""
    json_sidecar = find_json_for_media(heic_path)
    if not json_sidecar or not json_sidecar.exists():
        return

    try:
        with open(json_sidecar, "r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return

    old_title = data.get("title", "")
    if old_title.lower().endswith((".heic",)):
        data["title"] = old_title.rsplit(".", 1)[0] + ".jpg"

    new_json_name = json_sidecar.name.replace(heic_path.name, jpg_path.name)
    if new_json_name == json_sidecar.name:
        stem_lower = heic_path.stem.lower()
        if stem_lower in json_sidecar.name.lower():
            new_json_name = json_sidecar.name.replace(heic_path.stem, jpg_path.stem)
            new_json_name = new_json_name.replace(heic_path.stem.upper(), jpg_path.stem)

    new_json_path = json_sidecar.parent / new_json_name

    with open(json_sidecar, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    if new_json_path != json_sidecar:
        json_sidecar.rename(new_json_path)


def run_heic_conversion(file_ids: list[str]) -> None:
    """Background thread: convert HEIC files to JPG."""
    global unfiled_cache

    heic_paths: list[Path] = []
    for fid in file_ids:
        safe_name = Path(str(fid)).name
        fp = photos_dir / safe_name
        if fp.exists() and fp.suffix.lower() == ".heic":
            heic_paths.append(fp)

    with convert_lock:
        convert_status["running"] = True
        convert_status["done"] = 0
        convert_status["total"] = len(heic_paths)
        convert_status["errors"] = []

    converted_map: dict[str, str] = {}

    for heic_path in heic_paths:
        try:
            jpg_path = convert_single_heic(heic_path)
            update_json_for_conversion(heic_path, jpg_path)
            heic_path.unlink()
            converted_map[heic_path.name] = jpg_path.name
        except Exception as e:
            with convert_lock:
                convert_status["errors"].append(f"{heic_path.name}: {e}")

        with convert_lock:
            convert_status["done"] += 1

    with convert_lock:
        new_cache = []
        for entry in unfiled_cache:
            old_fn = entry["filename"]
            if old_fn in converted_map:
                new_fn = converted_map[old_fn]
                new_title = entry["title"]
                if new_title.lower().endswith(".heic"):
                    new_title = new_title.rsplit(".", 1)[0] + ".jpg"
                new_cache.append({
                    **entry,
                    "id": new_fn,
                    "title": new_title,
                    "filename": new_fn,
                })
            else:
                new_cache.append(entry)
        unfiled_cache = new_cache
        convert_status["running"] = False


class GalleryHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def read_body(self) -> dict:
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        return json.loads(raw)

    def send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, filepath: Path):
        if not filepath.exists():
            self.send_error(404)
            return
        ctype, _ = mimetypes.guess_type(str(filepath))
        if ctype is None:
            ctype = "application/octet-stream"
        try:
            size = filepath.stat().st_size
            self.send_response(200)
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(size))
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            with open(filepath, "rb") as f:
                while True:
                    chunk = f.read(65536)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
        except BrokenPipeError:
            pass

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/api/info":
            heic_count = sum(
                1 for p in unfiled_cache if p["filename"].lower().endswith(".heic")
            )
            self.send_json({
                "year": detected_year,
                "folder": photos_dir.name,
                "heicCount": heic_count,
            })
            return

        if path == "/api/photos":
            self.send_json(unfiled_cache)
            return

        if path == "/api/albums":
            albums = []
            for d in get_album_dirs():
                albums.append({"name": d.name, "path": d.name})
            self.send_json(albums)
            return

        if path == "/api/convert-status":
            with convert_lock:
                self.send_json(dict(convert_status))
            return

        if path.startswith("/media/"):
            filename = path[7:]
            safe_name = Path(filename).name
            filepath = photos_dir / safe_name
            self.send_file(filepath)
            return

        if path == "/" or path == "/index.html":
            path = "/index.html"
        static_path = GALLERY_DIR / "dist" / path.lstrip("/")
        if static_path.exists() and static_path.is_file():
            self.send_file(static_path)
            return

        self.send_error(404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/api/trash":
            try:
                data = self.read_body()
            except (json.JSONDecodeError, ValueError):
                self.send_json({"error": "Invalid JSON"}, 400)
                return

            ids = data.get("ids", [])
            if not isinstance(ids, list):
                self.send_json({"error": "ids must be a list"}, 400)
                return

            trashed: list[str] = []
            errors: list[str] = []
            for file_id in ids:
                safe_name = Path(str(file_id)).name
                filepath = photos_dir / safe_name
                if not filepath.exists():
                    errors.append(f"Not found: {safe_name}")
                    continue
                try:
                    json_sidecar = find_json_for_media(filepath)
                    move_to_trash(filepath)
                    if json_sidecar and json_sidecar.exists():
                        move_to_trash(json_sidecar)
                    trashed.append(safe_name)
                except OSError as e:
                    errors.append(f"Error trashing {safe_name}: {e}")

            remove_from_cache(set(trashed))
            self.send_json({"trashed": trashed, "errors": errors})
            return

        if path == "/api/move":
            try:
                data = self.read_body()
            except (json.JSONDecodeError, ValueError):
                self.send_json({"error": "Invalid JSON"}, 400)
                return

            ids = data.get("ids", [])
            album_name = data.get("album", "")
            if not isinstance(ids, list) or not album_name:
                self.send_json({"error": "ids (list) and album (string) required"}, 400)
                return

            safe_album = Path(str(album_name)).name
            album_path = TAKEOUT_DIR / safe_album
            if not album_path.exists() or not album_path.is_dir():
                self.send_json({"error": f"Album not found: {safe_album}"}, 404)
                return

            moved: list[str] = []
            errors: list[str] = []
            for file_id in ids:
                safe_name = Path(str(file_id)).name
                filepath = photos_dir / safe_name
                if not filepath.exists():
                    errors.append(f"Not found: {safe_name}")
                    continue
                try:
                    json_sidecar = find_json_for_media(filepath)
                    dest = album_path / filepath.name
                    if dest.exists():
                        errors.append(f"Already exists in album: {safe_name}")
                        continue
                    shutil.move(str(filepath), str(dest))
                    if json_sidecar and json_sidecar.exists():
                        json_dest = album_path / json_sidecar.name
                        shutil.move(str(json_sidecar), str(json_dest))
                    moved.append(safe_name)
                except OSError as e:
                    errors.append(f"Error moving {safe_name}: {e}")

            remove_from_cache(set(moved))
            self.send_json({"moved": moved, "album": safe_album, "errors": errors})
            return

        if path == "/api/convert-heic":
            with convert_lock:
                if convert_status["running"]:
                    self.send_json({"error": "Conversion already in progress"}, 409)
                    return

            try:
                data = self.read_body()
            except (json.JSONDecodeError, ValueError):
                self.send_json({"error": "Invalid JSON"}, 400)
                return

            ids = data.get("ids", [])
            if not isinstance(ids, list) or not ids:
                self.send_json({"error": "ids list required"}, 400)
                return

            thread = threading.Thread(target=run_heic_conversion, args=(ids,), daemon=True)
            thread.start()
            self.send_json({"started": True, "count": len(ids)})
            return

        self.send_error(404)


def main():
    global photos_dir, detected_year

    photos_dir, detected_year = detect_photos_folder()
    print(f"Takeout dir: {TAKEOUT_DIR}")
    print(f"Photos dir:  {photos_dir.name} (year: {detected_year})\n")

    build_index()

    port = 8025
    print(f"\nServer: http://localhost:{port}")
    print("Press Ctrl+C to stop.\n")
    server = HTTPServer(("127.0.0.1", port), GalleryHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        server.server_close()


if __name__ == "__main__":
    main()
