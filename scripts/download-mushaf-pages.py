#!/usr/bin/env python3
"""Download and verify the 604 Hafs/Tajweed Mushaf page scans from Mushaf Mauri."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import Request, urlopen
import sys

BASE = "https://raw.githubusercontent.com/Zizwar/mushaf-mauri/expo55/_archive/assets/pages/hafsTajweed/page"
DEST = Path("assets/mushaf/hafsTajweed")
TOTAL = 604

def download(number):
    target = DEST / f"page{number}.png"
    request = Request(f"{BASE}{number}.png", headers={"User-Agent": "Dhker-Mushaf-Asset-Mirror/1.0"})
    with urlopen(request, timeout=60) as response:
        data = response.read()
    if len(data) < 1000 or not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"Invalid PNG payload for page {number}")
    target.write_bytes(data)
    return number, len(data)

def main():
    DEST.mkdir(parents=True, exist_ok=True)
    completed = []
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(download, n) for n in range(1, TOTAL + 1)]
        for future in as_completed(futures):
            completed.append(future.result())
            if len(completed) % 50 == 0:
                print(f"Downloaded and verified {len(completed)}/{TOTAL} pages", flush=True)
    total_bytes = sum(size for _, size in completed)
    if len(completed) != TOTAL or any(not (DEST / f"page{n}.png").exists() for n in range(1, TOTAL + 1)):
        raise RuntimeError("The local Mushaf set is incomplete")
    print(f"SUCCESS: {TOTAL} PNG pages verified; {total_bytes:,} bytes ({total_bytes/1024/1024:.2f} MiB)")
if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
