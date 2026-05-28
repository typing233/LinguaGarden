from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.routers import auth, users, vocabularies, word_lists, tags, exercises, vision, progress

app = FastAPI(title="LinguaGarden API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vocabularies.router)
app.include_router(word_lists.router)
app.include_router(tags.router)
app.include_router(exercises.router)
app.include_router(vision.router)
app.include_router(progress.router)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "LinguaGarden"}
