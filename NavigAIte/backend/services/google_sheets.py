import os
from pathlib import Path

import gspread
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

load_dotenv()

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]


def _resolve_sheet_id() -> str:
    sheet_id = os.getenv("SHEET_ID")
    if not sheet_id:
        raise RuntimeError("SHEET_ID environment variable is not set.")
    return sheet_id


def _resolve_credentials_path() -> Path:
    creds_setting = os.getenv("GOOGLE_CREDENTIALS", "service_account.json")
    creds_path = Path(creds_setting)
    if not creds_path.is_absolute():
        creds_path = _BACKEND_ROOT / creds_path

    if not creds_path.exists():
        raise FileNotFoundError(
            f"Google credentials file not found at {creds_path}. "
            "Set GOOGLE_CREDENTIALS to a valid path."
        )

    return creds_path


def load_college_data():
    creds_path = _resolve_credentials_path()
    creds = Credentials.from_service_account_file(str(creds_path), scopes=_SCOPES)
    client = gspread.authorize(creds)
    sheet = client.open_by_key(_resolve_sheet_id()).sheet1

    return sheet.get_all_records()
