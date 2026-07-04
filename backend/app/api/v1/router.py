from fastapi import APIRouter

from app.api.v1.datasets import router as datasets_router

# Feature routers (analyses, charts, ...) are added here as they land, one
# module prompt at a time (see PRD section 4.2 onward).
api_router = APIRouter(prefix="/api/v1")
api_router.include_router(datasets_router)
