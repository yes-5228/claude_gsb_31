"""API v1 路由聚合。"""

from fastapi import APIRouter

from app.api.v1.endpoints import inspections, issues, meta, restrooms, stats

api_router = APIRouter()
api_router.include_router(restrooms.router)
api_router.include_router(inspections.router)
api_router.include_router(issues.router)
api_router.include_router(stats.router)
api_router.include_router(meta.router)

__all__ = ["api_router"]
