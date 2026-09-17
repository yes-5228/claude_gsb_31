"""Pydantic 数据模型。"""

from app.schemas.common import Page, PageMeta, MessageOut
from app.schemas.inspection import (
    InspectionBrief,
    InspectionCreate,
    InspectionItem,
    InspectionOut,
    InspectionUpdate,
)
from app.schemas.issue import (
    IssueCreate,
    IssueOut,
    IssueStatusUpdate,
    IssueUpdate,
    RectificationRecordOut,
)
from app.schemas.restroom import (
    RestroomBrief,
    RestroomCreate,
    RestroomDetail,
    RestroomOut,
    RestroomUpdate,
)
from app.schemas.stats import DashboardStats

__all__ = [
    "Page",
    "PageMeta",
    "MessageOut",
    "RestroomBrief",
    "RestroomCreate",
    "RestroomUpdate",
    "RestroomOut",
    "RestroomDetail",
    "InspectionItem",
    "InspectionBrief",
    "InspectionCreate",
    "InspectionUpdate",
    "InspectionOut",
    "RectificationRecordOut",
    "IssueCreate",
    "IssueUpdate",
    "IssueStatusUpdate",
    "IssueOut",
    "DashboardStats",
]
