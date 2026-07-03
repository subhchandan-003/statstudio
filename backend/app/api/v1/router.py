from fastapi import APIRouter

# Feature routers (datasets, analyses, charts, ...) are added here as they
# land, one module prompt at a time (see PRD section 4.2 onward).
api_router = APIRouter(prefix="/api/v1")
