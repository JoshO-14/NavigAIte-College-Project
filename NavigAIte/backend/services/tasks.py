from __future__ import annotations

import sqlite3
import json
import uuid
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "data"
DB_FILE = DATA_DIR / "user_tasks.db"


def _connect():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_FILE), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def _ensure_db():
    """Create DB and tables if missing.
    This function ensures the SQLite file and tables exist and that the
    extended user columns (interests, extracurriculars) are present.
    """
    conn = _connect()
    cur = conn.cursor()
    cur.executescript(
        """
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      gpa REAL,
      sat INTEGER,
      intended_major TEXT,
      financial_need TEXT,
      llm_needs_recalc INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      note TEXT,
      due_date TEXT,
      done INTEGER DEFAULT 0,
      source TEXT,
      created_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      title TEXT,
      url TEXT,
      description TEXT
    );
    """
    )
    conn.commit()

    # Ensure new columns exist for extended profile fields (interests, extracurriculars)
    cur.execute("PRAGMA table_info(users)")
    cols = [r[1] for r in cur.fetchall()]
    if 'interests' not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN interests TEXT")
    if 'extracurriculars' not in cols:
        cur.execute("ALTER TABLE users ADD COLUMN extracurriculars TEXT")
    conn.commit()
    return conn


def _get_user_row(conn, user_id: str):
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    return row


def _ensure_user(conn, user_id: str):
    row = _get_user_row(conn, user_id)
    if row:
        return row
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO users (id, name, llm_needs_recalc, interests, extracurriculars, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, "New Student", 1, json.dumps([]), json.dumps([]), now, now),
    )
    conn.commit()
    return _get_user_row(conn, user_id)


def get_user_tasks(user_id: str) -> list:
    conn = _ensure_db()
    _ensure_user(conn, user_id)
    cur = conn.cursor()
    cur.execute("SELECT * FROM tasks WHERE user_id = ?", (user_id,))
    rows = cur.fetchall()
    tasks = []
    for r in rows:
        cur.execute("SELECT title, url, description FROM resources WHERE task_id = ?", (r["id"],))
        res = [dict(x) for x in cur.fetchall()]
        tasks.append(
            {
                "id": r["id"],
                "title": r["title"],
                "note": r["note"],
                "due_date": r["due_date"],
                "done": bool(r["done"]),
                "created_at": r["created_at"],
                "completed_at": r["completed_at"],
                "source": r["source"],
                "resources": res,
            }
        )
    return tasks


def add_task_for_user(user_id: str, task: dict) -> dict:
    conn = _ensure_db()
    _ensure_user(conn, user_id)
    task_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO tasks (id, user_id, title, note, due_date, done, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (task_id, user_id, task.get("title"), task.get("note"), task.get("due_date"), 0, task.get("source") or "user", now),
    )
    # mark llm needs recalc
    cur.execute("UPDATE users SET llm_needs_recalc = 1, updated_at = ? WHERE id = ?", (now, user_id))
    conn.commit()
    return {
        "id": task_id,
        "title": task.get("title"),
        "note": task.get("note"),
        "due_date": task.get("due_date"),
        "done": False,
        "created_at": now,
    }


def toggle_task_done(user_id: str, task_id: str, done: bool) -> bool:
    conn = _ensure_db()
    _ensure_user(conn, user_id)
    cur = conn.cursor()
    now = datetime.utcnow().isoformat()
    if done:
        cur.execute("UPDATE tasks SET done = 1, completed_at = ? WHERE id = ? AND user_id = ?", (now, task_id, user_id))
    else:
        cur.execute("UPDATE tasks SET done = 0, completed_at = NULL WHERE id = ? AND user_id = ?", (task_id, user_id))
    cur.execute("UPDATE users SET llm_needs_recalc = 1, updated_at = ? WHERE id = ?", (now, user_id))
    conn.commit()
    return cur.rowcount > 0


def clear_needs_recalc(user_id: str) -> bool:
    conn = _ensure_db()
    cur = conn.cursor()
    cur.execute("UPDATE users SET llm_needs_recalc = 0, updated_at = ? WHERE id = ? AND llm_needs_recalc = 1", (datetime.utcnow().isoformat(), user_id))
    conn.commit()
    return cur.rowcount > 0


def set_recommendations(user_id: str, recommendations: list) -> dict:
    conn = _ensure_db()
    _ensure_user(conn, user_id)
    cur = conn.cursor()
    # remove old LLM tasks
    cur.execute("DELETE FROM tasks WHERE user_id = ? AND source = 'llm'", (user_id,))
    new_tasks = []
    now = datetime.utcnow().isoformat()
    for rec in recommendations:
        task_id = rec.get("id") or str(uuid.uuid4())
        cur.execute(
            "INSERT INTO tasks (id, user_id, title, note, due_date, done, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (task_id, user_id, rec.get("title"), rec.get("note"), rec.get("due_date"), 0, "llm", now),
        )
        for r in (rec.get("resources") or []):
            cur.execute(
                "INSERT INTO resources (id, task_id, title, url, description) VALUES (?, ?, ?, ?, ?)",
                (str(uuid.uuid4()), task_id, r.get("title"), r.get("url"), r.get("description")),
            )
        new_tasks.append({"id": task_id, "title": rec.get("title"), "note": rec.get("note"), "due_date": rec.get("due_date"), "resources": rec.get("resources") or []})
    # clear flag
    cur.execute("UPDATE users SET llm_needs_recalc = 0, updated_at = ? WHERE id = ?", (now, user_id))
    conn.commit()
    return {"recommendations_stored": len(new_tasks), "tasks": new_tasks}

