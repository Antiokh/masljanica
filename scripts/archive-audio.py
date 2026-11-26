#!/usr/bin/env python3
"""Archive audio already referenced by the public catalog; preserve the original URLs."""
import concurrent.futures
import hashlib
import json
import pathlib
import re
import subprocess
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data"
DEST = ROOT / "public/media/audio"
MANIFEST = DATA / "audio-archive.json"
MAX_BYTES = 25 * 1024 * 1024  # Cloudflare Pages maximum asset size
HOSTS = {"rozhdestvenka.ru", "www.rozhdestvenka.ru", "rslive.ru", "www.rslive.ru", "nsportal.ru", "www.nsportal.ru"}

def valid_url(url):
    u = urllib.parse.urlparse(url)
    return u.scheme == "https" and u.hostname in HOSTS and not u.username and not u.password

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not valid_url(newurl):
            raise ValueError("Unexpected redirect host or scheme")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def audio_info(path):
    with path.open("rb") as f:
        head = f.read(3)
    if len(head) < 3 or not (head == b"ID3" or (head[0] == 255 and head[1] & 224 == 224)):
        raise ValueError("Not an MP3 file")
    probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=codec_name:format=duration", "-of", "json", str(path)],
        capture_output=True, text=True, check=True, timeout=30)
    info = json.loads(probe.stdout)
    if not any(s.get("codec_name") == "mp3" for s in info.get("streams", [])):
        raise ValueError("No MP3 audio stream")
    duration = float(info.get("format", {}).get("duration", 0))
    if duration <= 0:
        raise ValueError("Empty audio")
    return round(duration, 3)

def archive(url, old):
    if not valid_url(url):
        raise ValueError("Unexpected URL")
    name = pathlib.PurePosixPath(urllib.parse.unquote(urllib.parse.urlparse(url).path)).name
    stem = re.sub(r"[^a-z0-9_-]+", "-", re.sub(r"(?:\.mp3)+$", "", name, flags=re.I).lower()).strip("-")[:90] or "audio"
    name = stem + "-" + hashlib.sha256(url.encode()).hexdigest()[:10] + ".mp3"
    dest = DEST / name
    if dest.is_file() and old.get("sha256") == hashlib.sha256(dest.read_bytes()).hexdigest():
        return old
    opener = urllib.request.build_opener(SafeRedirect())
    req = urllib.request.Request(url, headers={"User-Agent": "MasljanicaAudioArchive/1.0", "Accept": "audio/*,application/octet-stream;q=0.9,*/*;q=0.1"})
    for attempt in range(3):
        tmp = None
        try:
            with opener.open(req, timeout=45) as response:
                if not valid_url(response.geturl()):
                    raise ValueError("Unexpected final URL")
                with tempfile.NamedTemporaryFile(dir=DEST, suffix=".mp3", delete=False) as out:
                    tmp = pathlib.Path(out.name)
                    total = 0
                    while chunk := response.read(65536):
                        total += len(chunk)
                        if total > MAX_BYTES:
                            raise ValueError("Exceeds Cloudflare Pages 25 MiB asset limit")
                        out.write(chunk)
            duration = audio_info(tmp)
            sha = hashlib.sha256(tmp.read_bytes()).hexdigest()
            tmp.replace(dest)
            return {"path": "/media/audio/" + name, "bytes": total, "sha256": sha, "duration": duration}
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
        finally:
            if tmp and tmp.exists():
                tmp.unlink()

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    old = json.loads(MANIFEST.read_text("utf8")).get("files", {}) if MANIFEST.exists() else {}
    urls = sorted({url for section in ("songs", "games")
        for item in json.loads((DATA / (section + ".json")).read_text("utf8"))
        for url in item.get("audio", []) if url})
    files, errors = {}, {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        jobs = {pool.submit(archive, url, old.get(url, {})): url for url in urls}
        for job in concurrent.futures.as_completed(jobs):
            url = jobs[job]
            try:
                files[url] = job.result()
                print("OK", url, files[url]["bytes"], flush=True)
            except Exception as err:
                errors[url] = str(err)
                print("FAILED", url, err, flush=True)
    report = {"files": dict(sorted(files.items())), "errors": dict(sorted(errors.items())),
              "total": len(urls), "archived": len(files),
              "bytes": sum(item["bytes"] for item in files.values())}
    MANIFEST.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", "utf8")
    print(f"Archived {len(files)}/{len(urls)} URLs; {report['bytes']} bytes; {len(errors)} failed")
    if errors:
        print("Unarchived URLs remain external. See src/data/audio-archive.json.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
