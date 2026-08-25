import os
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

from db import _get_connection, _execute_schema_updates


def test_sqlite_connection_uses_local_file(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "")
    monkeypatch.setattr("db.BASE_DIR", tmp_path)
    monkeypatch.setattr("db.DB_FILE", tmp_path / "catalog.db")
    conn = _get_connection()
    cursor = conn.cursor()
    _execute_schema_updates(cursor)
    conn.commit()
    conn.close()
    assert (tmp_path / "catalog.db").exists()
