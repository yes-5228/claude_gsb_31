"""问题上报与整改跟踪业务逻辑。"""

from datetime import date, datetime, time

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.constants import (
    ISSUE_TRANSITIONS,
    OPEN_ISSUE_STATUSES,
    TRANSITION_ACTIONS,
    IssueStatus,
)
from app.core.exceptions import DomainError, NotFoundError
from app.models import Inspection, Issue, RectificationRecord, Restroom
from app.schemas.issue import IssueCreate, IssueOut, IssueStatusUpdate, IssueUpdate
from app.services import restroom_service

SORTABLE_FIELDS = {
    "report_time": Issue.report_time,
    "deadline": Issue.deadline,
    "severity": Issue.severity,
    "status": Issue.status,
    "code": Issue.code,
    "updated_at": Issue.updated_at,
}


def _next_code(db: Session) -> str:
    prefix = datetime.now().strftime("WT-%Y%m%d")
    seq = (
        db.scalar(
            select(func.count()).select_from(Issue).where(Issue.code.like(f"{prefix}-%"))
        )
        or 0
    ) + 1
    while True:
        code = f"{prefix}-{seq:03d}"
        if not db.scalar(select(Issue.id).where(Issue.code == code)):
            return code
        seq += 1


def _values(data: dict) -> dict:
    return {key: (value.value if hasattr(value, "value") else value) for key, value in data.items()}


def get_issue(db: Session, issue_id: int) -> Issue:
    issue = db.get(Issue, issue_id)
    if issue is None:
        raise NotFoundError(f"问题 {issue_id} 不存在")
    return issue


def to_out(issue: Issue) -> IssueOut:
    return IssueOut.model_validate(issue)


def is_overdue(issue: Issue) -> bool:
    return (
        issue.deadline is not None
        and issue.status in OPEN_ISSUE_STATUSES
        and issue.deadline < datetime.now()
    )


def list_issues(
    db: Session,
    *,
    restroom_id: int | None = None,
    inspection_id: int | None = None,
    district: str | None = None,
    status: str | None = None,
    statuses: list[str] | None = None,
    category: str | None = None,
    severity: str | None = None,
    keyword: str | None = None,
    overdue: bool | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = 1,
    page_size: int = 10,
    sort_by: str = "report_time",
    order: str = "desc",
) -> tuple[list[Issue], int]:
    stmt = select(Issue)
    if district:
        stmt = stmt.join(Restroom, Restroom.id == Issue.restroom_id).where(
            Restroom.district == district
        )
    if restroom_id:
        stmt = stmt.where(Issue.restroom_id == restroom_id)
    if inspection_id:
        stmt = stmt.where(Issue.inspection_id == inspection_id)
    if status:
        stmt = stmt.where(Issue.status == status)
    if statuses:
        stmt = stmt.where(Issue.status.in_(statuses))
    if category:
        stmt = stmt.where(Issue.category == category)
    if severity:
        stmt = stmt.where(Issue.severity == severity)
    if date_from:
        stmt = stmt.where(Issue.report_time >= datetime.combine(date_from, time.min))
    if date_to:
        stmt = stmt.where(Issue.report_time <= datetime.combine(date_to, time.max))
    if overdue is True:
        stmt = stmt.where(
            Issue.deadline.is_not(None),
            Issue.deadline < datetime.now(),
            Issue.status.in_(OPEN_ISSUE_STATUSES),
        )
    elif overdue is False:
        stmt = stmt.where(
            or_(Issue.deadline.is_(None), Issue.deadline >= datetime.now()),
            Issue.status.in_(OPEN_ISSUE_STATUSES),
        )
    if keyword:
        like = f"%{keyword.strip()}%"
        stmt = stmt.where(
            or_(
                Issue.title.like(like),
                Issue.description.like(like),
                Issue.code.like(like),
                Issue.assignee.like(like),
                Issue.reporter.like(like),
            )
        )

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    column = SORTABLE_FIELDS.get(sort_by, Issue.report_time)
    stmt = stmt.order_by(column.desc() if order == "desc" else column.asc(), Issue.id.desc())
    rows = list(db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)))
    return rows, total


def create_issue(db: Session, payload: IssueCreate) -> Issue:
    restroom_service.get_restroom(db, payload.restroom_id)
    if payload.inspection_id is not None:
        inspection = db.get(Inspection, payload.inspection_id)
        if inspection is None:
            raise NotFoundError(f"巡查记录 {payload.inspection_id} 不存在")
        if inspection.restroom_id != payload.restroom_id:
            raise DomainError("关联的巡查记录与所选公厕不一致")

    data = _values(payload.model_dump(exclude={"inspection_id", "report_time", "initial_remark"}))
    issue = Issue(
        code=_next_code(db),
        inspection_id=payload.inspection_id,
        report_time=payload.report_time or datetime.now(),
        status=IssueStatus.PENDING.value,
        **data,
    )
    issue.records.append(
        RectificationRecord(
            action="上报问题",
            from_status="",
            to_status=IssueStatus.PENDING.value,
            operator=payload.reporter or "巡查员",
            remark=payload.initial_remark or "巡查发现，等待派单整改",
        )
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    restroom_service.touch(db, issue.restroom_id)
    return issue


def update_issue(db: Session, issue_id: int, payload: IssueUpdate) -> Issue:
    issue = get_issue(db, issue_id)
    issue_data = payload.model_dump(exclude_unset=True)
    if "images" in issue_data and payload.images is not None:
        issue_data["images"] = list(payload.images)
    for key, value in _values(issue_data).items():
        setattr(issue, key, value)
    db.commit()
    db.refresh(issue)
    return issue


def allowed_transitions(issue: Issue) -> list[dict[str, str]]:
    return [
        {"status": target, "action": TRANSITION_ACTIONS.get((issue.status, target), "状态变更")}
        for target in ISSUE_TRANSITIONS.get(issue.status, [])
    ]


def change_status(db: Session, issue_id: int, payload: IssueStatusUpdate) -> Issue:
    issue = get_issue(db, issue_id)
    target = payload.to_status.value
    if target == issue.status:
        raise DomainError(f"问题已处于「{target}」状态")
    allowed = ISSUE_TRANSITIONS.get(issue.status, [])
    if target not in allowed:
        raise DomainError(
            f"当前状态「{issue.status}」不允许流转到「{target}」，可选："
            + ("、".join(allowed) if allowed else "无（流程已结束）")
        )

    from_status = issue.status
    issue.status = target
    issue.closed_at = datetime.now() if target == IssueStatus.CLOSED.value else None
    if payload.to_status == IssueStatus.PROCESSING and payload.operator:
        issue.assignee = payload.operator if not issue.assignee else issue.assignee
    issue.records.append(
        RectificationRecord(
            action=TRANSITION_ACTIONS.get((from_status, target), "状态变更"),
            from_status=from_status,
            to_status=target,
            operator=payload.operator,
            remark=payload.remark,
        )
    )
    db.commit()
    db.refresh(issue)
    restroom_service.touch(db, issue.restroom_id)
    return issue


def add_record(db: Session, issue_id: int, *, action: str, operator: str, remark: str | None) -> Issue:
    """在不改变状态的前提下追加跟进记录（如整改进度说明）。"""
    issue = get_issue(db, issue_id)
    if issue.status == IssueStatus.CLOSED.value:
        raise DomainError("问题已关闭，无法追加整改记录")
    issue.records.append(
        RectificationRecord(
            action=action or "整改进度",
            from_status=issue.status,
            to_status=issue.status,
            operator=operator,
            remark=remark,
        )
    )
    db.commit()
    db.refresh(issue)
    return issue


def delete_issue(db: Session, issue_id: int) -> None:
    issue = get_issue(db, issue_id)
    db.delete(issue)
    db.commit()
