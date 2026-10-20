#!/usr/bin/env python3
"""Consistent SQLite backup. Read DATABASE_URL from the environment, never print credentials."""
import os, sqlite3, sys
from pathlib import Path
from datetime import datetime, timezone
url=os.environ.get("DATABASE_URL", "file:./dev.db")
if not url.startswith("file:"):
 raise SystemExit("This helper is only for SQLite. Use pg_dump for PostgreSQL.")
source=Path(url[5:])
if not source.is_absolute(): source=Path(__file__).resolve().parents[1]/"prisma"/source
if not source.is_file(): raise SystemExit("SQLite source does not exist.")
directory=Path(sys.argv[1] if len(sys.argv)>1 else "backups")
directory.mkdir(parents=True,exist_ok=True)
destination=directory/("minecraft-"+datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")+".db")
with sqlite3.connect(f"file:{source}?mode=ro",uri=True) as src, sqlite3.connect(destination) as dst:
 src.backup(dst)
os.chmod(destination,0o600)
print(f"Backup ready: {destination}")
