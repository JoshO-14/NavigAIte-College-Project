"""Shared OpenAI client helpers for the PDF summarizer."""

from __future__ import annotations

import os
from functools import lru_cache
from typing import Optional

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def _resolve_api_key() -> Optional[str]:
    """Prefer OPENAI_API_KEY but fall back to legacy OPEN_AI_KEY."""
    return os.getenv("OPENAI_API_KEY") or os.getenv("OPEN_AI_KEY")


@lru_cache(maxsize=1)
def get_openai_client() -> OpenAI:
    api_key = _resolve_api_key()
    if not api_key:
        raise RuntimeError(
            "OpenAI API key not configured. Set OPENAI_API_KEY or OPEN_AI_KEY."
        )

    return OpenAI(api_key=api_key)


def summarize_pdf(college_name, pdf_text):
    prompt = f"""
    You are analyzing the Common Data Set for {college_name}.
    Extract key information such as:
    - Acceptance rate
    - Average GPA and SAT/ACT
    - Most popular majors
    - Financial aid stats
    - Class size and student-faculty ratio
    - Any notable programs or distinctions

    Then, summarize the insights clearly.
    """

    response = get_openai_client().chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are an expert education data analyst."},
            {"role": "user", "content": prompt + "\n\n" + pdf_text},
        ],
        temperature=0.5,
    )

    return response.choices[0].message.content
