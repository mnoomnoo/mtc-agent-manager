from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.config_sets import router as config_sets_router
from app.api.routes.settings_route import router as settings_router

app = FastAPI(title="MTConnect Agent Config Manager")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(config_sets_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
