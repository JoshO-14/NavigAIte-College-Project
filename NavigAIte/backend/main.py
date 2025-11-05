
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import typing as t

from services.data_loader import load_college_data
from services.pdf_reader import extract_text_from_pdf
from services.openai_summarizer import summarize_pdf
from services.cache_manager import load_cache, save_cache
from services.chatbot import college_chat
from services.tasks import (
    get_user_dashboard,
    add_task_for_user,
    toggle_task_done,
    get_user_tasks,
    clear_needs_recalc,
    set_recommendations,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

college_cache = {}

@app.on_event("startup")
def load_or_generate_cache():
    global college_cache
    print("Loading cached summaries...")
    cache = load_cache()

    if not cache:
        print("⚙️ Generating summaries for the first time...")
        data = load_college_data()
        for row in data:
            name = row.get("College Name")
            pdf_url = row.get("PDF Link")

            print(f"Processing {name}...")
            pdf_text = extract_text_from_pdf(pdf_url)
            summary = summarize_pdf(name, pdf_text)
            cache[name] = {"summary": summary, "sheet_data": row}

        save_cache(cache)

    college_cache = cache
    print("Cache ready with", len(college_cache), "colleges.")


# Chat request body
class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    user_message = req.message
    print(f" User asked: {user_message}")
    reply = college_chat(user_message, college_cache)
    return {"response": reply}


@app.get("/")
async def home():
    return {"message": "NavigAIte Backend API is running 🚀"}


@app.get("/user/{user_id}/dashboard")
async def user_dashboard(user_id: str):
    """Return the user's profile and current task checklist.

    Frontend hook: call this to render the dashboard with the checklist and any LLM-provided task resources.
    """
    return get_user_dashboard(user_id)


@app.get("/user/{user_id}/tasks")
async def user_tasks(user_id: str):
    """Return the user's current task list."""
    return {"tasks": get_user_tasks(user_id)}


class CreateTaskRequest(BaseModel):
    title: str
    note: t.Optional[str] = None
    due_date: t.Optional[str] = None  # ISO date string optional


@app.post("/user/{user_id}/tasks")
async def create_task(user_id: str, req: CreateTaskRequest):
    """Create a new task for the user. Frontend should POST here when user adds a custom task."""
    task = {
        "title": req.title,
        "note": req.note,
        "due_date": req.due_date,
    }
    new_task = add_task_for_user(user_id, task)
    return {"task": new_task}


class CheckTaskRequest(BaseModel):
    done: bool


@app.post("/user/{user_id}/tasks/{task_id}/check")
async def check_task(user_id: str, task_id: str, req: CheckTaskRequest):
    """Toggle a task as done/undone. When checked, backend will recalc standing and suggestions.

    Frontend hook: call this when user checks off a task; use response to update UI.
    """
    updated = toggle_task_done(user_id, task_id, req.done)
    return {"updated": updated, "dashboard": get_user_dashboard(user_id)}


@app.post("/user/{user_id}/recalc/clear")
async def clear_recalc_flag(user_id: str):
    """Endpoint for the LLM/agent to call after it has recomputed recommendations for this user.

    This clears the `llm_needs_recalc` flag so the backend knows the agent processed the change.
    """
    ok = clear_needs_recalc(user_id)
    return {"cleared": ok, "dashboard": get_user_dashboard(user_id)}


class RecommendationItem(BaseModel):
    title: str
    note: t.Optional[str] = None
    due_date: t.Optional[str] = None
    resources: t.Optional[list] = None
    id: t.Optional[str] = None


class RecommendationsRequest(BaseModel):
    recommendations: list[RecommendationItem]


@app.post("/user/{user_id}/recommendations")
async def post_recommendations(user_id: str, req: RecommendationsRequest):
    """LLM/agent should POST recommendations here after computation.

    The backend will store the recommendations (as tasks with source='llm'),
    clear the llm_needs_recalc flag, and return the updated dashboard.

    Frontend hook: call GET /user/{user_id}/dashboard to render returned tasks and resources.
    """
    recs = [r.dict() for r in req.recommendations]
    res = set_recommendations(user_id, recs)
    return {"saved": True, "result": res, "dashboard": get_user_dashboard(user_id)}


