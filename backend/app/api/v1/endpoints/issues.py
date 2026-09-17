"""问题上报与整改跟踪接口。"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import PaginationDep, build_meta
from app.core.constants import OPEN_ISSUE_STATUSES
from app.core.database import get_db
from app.schemas.common import MessageOut, Page
from app.schemas.issue import IssueCreate, IssueOut, IssueStatusUpdate, IssueUpdate
from app.services import issue_service

router = APIRouter(prefix="/issues", tags=["问题上报"])


class RecordCreate(BaseModel):
    action: str = Field(default="整改进度", max_length=30)
    operator: str = Field(min_length=1, max_length=60)
    remark: str | None = Field(default=None, max_length=500)


class TransitionOption(BaseModel):
    status: str
    action: str


@router.get("", response_model=Page[IssueOut], summary="问题列表")
def list_issues(
    db: Annotated[Session, Depends(get_db)],
    pagination: PaginationDep,
    restroom_id: Annotated[int | None, Query(description="按公厕过滤")] = None,
    inspection_id: Annotated[int | None, Query(description="按巡查记录过滤")] = None,
    district: Annotated[str | None, Query(description="按区域过滤")] = None,
    status: Annotated[str | None, Query(description="整改状态")] = None,
    open_only: Annotated[bool, Query(description="仅看未闭环问题")] = False,
    category: Annotated[str | None, Query(description="问题分类")] = None,
    severity: Annotated[str | None, Query(description="严重程度")] = None,
    keyword: Annotated[str | None, Query(description="标题/描述/编号模糊搜索")] = None,
    overdue: Annotated[bool | None, Query(description="是否超期")] = None,
    date_from: Annotated[date | None, Query(description="上报开始日期")] = None,
    date_to: Annotated[date | None, Query(description="上报结束日期")] = None,
    sort_by: Annotated[str, Query(description="排序字段")] = "report_time",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> Page[IssueOut]:
    statuses = list(OPEN_ISSUE_STATUSES) if open_only else None
    rows, total = issue_service.list_issues(
        db,
        restroom_id=restroom_id,
        inspection_id=inspection_id,
        district=district,
        status=status,
        statuses=statuses,
        category=category,
        severity=severity,
        keyword=keyword,
        overdue=overdue,
        date_from=date_from,
        date_to=date_to,
        page=pagination.page,
        page_size=pagination.page_size,
        sort_by=sort_by,
        order=order,
    )
    return Page[IssueOut](
        items=[issue_service.to_out(row) for row in rows],
        meta=build_meta(total, pagination),
    )


@router.post("", response_model=IssueOut, status_code=201, summary="上报问题")
def create_issue(payload: IssueCreate, db: Annotated[Session, Depends(get_db)]) -> IssueOut:
    return issue_service.to_out(issue_service.create_issue(db, payload))


@router.get("/{issue_id}", response_model=IssueOut, summary="问题详情与整改轨迹")
def get_issue(issue_id: int, db: Annotated[Session, Depends(get_db)]) -> IssueOut:
    return issue_service.to_out(issue_service.get_issue(db, issue_id))


@router.patch("/{issue_id}", response_model=IssueOut, summary="更新问题信息")
def update_issue(
    issue_id: int, payload: IssueUpdate, db: Annotated[Session, Depends(get_db)]
) -> IssueOut:
    return issue_service.to_out(issue_service.update_issue(db, issue_id, payload))


@router.post("/{issue_id}/transitions", response_model=IssueOut, summary="推进整改状态")
def change_status(
    issue_id: int, payload: IssueStatusUpdate, db: Annotated[Session, Depends(get_db)]
) -> IssueOut:
    return issue_service.to_out(issue_service.change_status(db, issue_id, payload))


@router.get(
    "/{issue_id}/transitions",
    response_model=list[TransitionOption],
    summary="可执行的整改动作",
)
def list_transitions(
    issue_id: int, db: Annotated[Session, Depends(get_db)]
) -> list[TransitionOption]:
    issue = issue_service.get_issue(db, issue_id)
    return [
        TransitionOption(**option) for option in issue_service.allowed_transitions(issue)
    ]


@router.post("/{issue_id}/records", response_model=IssueOut, summary="追加整改记录")
def add_record(
    issue_id: int, payload: RecordCreate, db: Annotated[Session, Depends(get_db)]
) -> IssueOut:
    issue = issue_service.add_record(
        db,
        issue_id,
        action=payload.action,
        operator=payload.operator,
        remark=payload.remark,
    )
    return issue_service.to_out(issue)


@router.delete("/{issue_id}", response_model=MessageOut, summary="删除问题")
def delete_issue(issue_id: int, db: Annotated[Session, Depends(get_db)]) -> MessageOut:
    issue_service.delete_issue(db, issue_id)
    return MessageOut(message="删除成功")
