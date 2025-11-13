
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.data_loader import load_college_data
from services.pdf_reader import extract_text_from_pdf
from services.openai_summarizer import summarize_pdf
from services.cache_manager import load_cache, save_cache

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


@app.get("/")
async def home():
    return {"message": "NavigAIte Backend API is running 🚀"}
