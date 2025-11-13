"""Wrapper around the Google Sheets loader to keep backward compatibility.

FastAPI's `main.py` expects a `services.data_loader` module that exposes
`load_college_data`.  The project already ships a Google Sheets client with the
same functionality, so this file simply re-exports it to avoid refactors.
"""

from services.google_sheets import load_college_data as load_college_data  # noqa: F401

