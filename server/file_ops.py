import os, re, io, zipfile, datetime, shutil
from typing import List, Tuple, Dict
from .settings import WORKSPACE_DIR, SNAPSHOT_DIR

FILE_BLOCK_RE = re.compile(r"```file:\s*(?P<path>[^\n]+)\n(?P<content>.*?)```", re.DOTALL)

def parse_file_blocks(text: str) -> List[Tuple[str, str]]:
    """Extract (path, content) tuples from ```file: path\n...``` blocks."""
    results = []
    for m in FILE_BLOCK_RE.finditer(text):
        rel_path = m.group("path").strip()
        # prevent path escape
        safe_path = os.path.normpath(rel_path).lstrip(os.sep)
        content = m.group("content")
        results.append((safe_path, content))
    return results

def ensure_parent(path: str):
    parent = os.path.dirname(path)
    if parent and not os.path.exists(parent):
        os.makedirs(parent, exist_ok=True)

def write_file(rel_path: str, content: str) -> str:
    if os.path.isabs(rel_path):
        raise ValueError("Refusing to write an absolute path")
    abs_path = os.path.join(WORKSPACE_DIR, rel_path)
    abs_path = os.path.abspath(abs_path)
    if os.path.commonpath((abs_path, os.path.abspath(WORKSPACE_DIR))) != os.path.abspath(WORKSPACE_DIR):
        raise ValueError("Refusing to write outside workspace")
    ensure_parent(abs_path)
    with open(abs_path, "w", encoding="utf-8") as f:
        f.write(content)
    return abs_path

def snapshot() -> str:
    ts = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    zip_path = os.path.join(SNAPSHOT_DIR, f"workspace_{ts}.zip")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
        for root, _, files in os.walk(WORKSPACE_DIR):
            for fn in files:
                p = os.path.join(root, fn)
                arc = os.path.relpath(p, WORKSPACE_DIR)
                z.write(p, arc)
    return ts

def list_snapshots() -> List[str]:
    if not os.path.isdir(SNAPSHOT_DIR):
        return []
    out = []
    for fn in os.listdir(SNAPSHOT_DIR):
        if fn.startswith("workspace_") and fn.endswith(".zip"):
            out.append(fn[len("workspace_"):-4])
    return sorted(out, reverse=True)

def restore(ts: str | None) -> str:
    if ts is None:
        snaps = list_snapshots()
        if not snaps: 
            raise FileNotFoundError("No snapshots available")
        ts = snaps[0]
    zip_path = os.path.join(SNAPSHOT_DIR, f"workspace_{ts}.zip")
    if not os.path.isfile(zip_path):
        raise FileNotFoundError(f"Snapshot not found: {ts}")
    # clear workspace first
    if os.path.isdir(WORKSPACE_DIR):
        for root, dirs, files in os.walk(WORKSPACE_DIR):
            for f in files:
                try:
                    os.remove(os.path.join(root, f))
                except FileNotFoundError:
                    pass
            for d in dirs:
                try:
                    shutil.rmtree(os.path.join(root, d))
                except FileNotFoundError:
                    pass
    os.makedirs(WORKSPACE_DIR, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as z:
        workspace = os.path.abspath(WORKSPACE_DIR)
        for member in z.infolist():
            target = os.path.abspath(os.path.join(workspace, member.filename))
            if os.path.commonpath((target, workspace)) != workspace:
                raise ValueError("Snapshot contains a path outside workspace")
        z.extractall(WORKSPACE_DIR)
    return ts
