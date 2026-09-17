"""统计看板业务逻辑。"""

from datetime import date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.constants import (
    OPEN_ISSUE_STATUSES,
    IssueCategory,
    IssueSeverity,
    IssueStatus,
    RestroomStatus,
)
from app.models import Inspection, Issue, Restroom
from app.schemas.stats import (
    CategoryStat,
    DashboardStats,
    DistrictStat,
    NameValue,
    OverviewStats,
    RestroomRankItem,
    TrendPoint,
)
from app.services import inspection_service, issue_service


def _count(db: Session, model, *conditions) -> int:
    stmt = select(func.count()).select_from(model)
    if conditions:
        stmt = stmt.where(*conditions)
    return db.scalar(stmt) or 0


def overview(db: Session) -> OverviewStats:
    now = datetime.now()
    today_start = datetime.combine(now.date(), time.min)
    week_start = today_start - timedelta(days=6)
    month_start = datetime.combine(date(now.year, now.month, 1), time.min)

    issue_total = _count(db, Issue)
    issue_open = _count(db, Issue, Issue.status.in_(OPEN_ISSUE_STATUSES))
    issue_overdue = _count(
        db,
        Issue,
        Issue.deadline.is_not(None),
        Issue.deadline < now,
        Issue.status.in_(OPEN_ISSUE_STATUSES),
    )
    done_count = _count(db, Issue, Issue.status == IssueStatus.DONE.value)
    closed_count = _count(db, Issue, Issue.status == IssueStatus.CLOSED.value)
    finished = done_count + closed_count

    return OverviewStats(
        restroom_total=_count(db, Restroom),
        restroom_open=_count(db, Restroom, Restroom.status == RestroomStatus.NORMAL.value),
        restroom_maintenance=_count(db, Restroom, Restroom.status == RestroomStatus.MAINTENANCE.value),
        inspection_total=_count(db, Inspection),
        inspection_today=_count(db, Inspection, Inspection.inspect_time >= today_start),
        inspection_week=_count(db, Inspection, Inspection.inspect_time >= week_start),
        avg_score_week=round(
            float(
                db.scalar(
                    select(func.avg(Inspection.score)).where(Inspection.inspect_time >= week_start)
                )
                or 0.0
            ),
            1,
        ),
        issue_total=issue_total,
        issue_open=issue_open,
        issue_overdue=issue_overdue,
        issue_done_this_month=_count(
            db, Issue, Issue.status == IssueStatus.DONE.value, Issue.updated_at >= month_start
        ),
        rectification_rate=round(finished / issue_total * 100, 1) if issue_total else 0.0,
    )


def issue_by_status(db: Session) -> list[NameValue]:
    rows = dict(
        db.execute(select(Issue.status, func.count()).group_by(Issue.status)).all()  # type: ignore[arg-type]
    )
    ordered = list(IssueStatus)
    return [NameValue(name=status.value, value=float(rows.get(status.value, 0))) for status in ordered]


def issue_by_severity(db: Session) -> list[NameValue]:
    rows = dict(db.execute(select(Issue.severity, func.count()).group_by(Issue.severity)).all())
    return [
        NameValue(name=severity.value, value=float(rows.get(severity.value, 0)))
        for severity in IssueSeverity
    ]


def issue_by_category(db: Session) -> list[CategoryStat]:
    rows = db.execute(
        select(Issue.category, func.count()).group_by(Issue.category)
    ).all()
    totals = {category: int(count) for category, count in rows}
    open_rows = db.execute(
        select(Issue.category, func.count())
        .where(Issue.status.in_(OPEN_ISSUE_STATUSES))
        .group_by(Issue.category)
    ).all()
    opens = {category: int(count) for category, count in open_rows}
    result: list[CategoryStat] = []
    for category in IssueCategory:
        total = totals.get(category.value, 0)
        open_count = opens.get(category.value, 0)
        result.append(
            CategoryStat(
                category=category.value, total=total, open=open_count, closed=total - open_count
            )
        )
    return result


def inspection_trend(db: Session, days: int = 14) -> list[TrendPoint]:
    days = max(3, min(days, 60))
    today = datetime.now().date()
    start = today - timedelta(days=days - 1)
    start_dt = datetime.combine(start, time.min)

    inspection_rows = db.execute(
        select(Inspection.inspect_time, Inspection.score).where(Inspection.inspect_time >= start_dt)
    ).all()
    issue_rows = db.execute(
        select(Issue.report_time).where(Issue.report_time >= start_dt)
    ).all()

    buckets: dict[str, dict[str, float]] = {}
    for offset in range(days):
        key = (start + timedelta(days=offset)).isoformat()
        buckets[key] = {"inspections": 0, "issues": 0, "score_sum": 0.0}
    for inspect_time, score in inspection_rows:
        key = inspect_time.date().isoformat()
        if key in buckets:
            buckets[key]["inspections"] += 1
            buckets[key]["score_sum"] += float(score or 0)
    for (report_time,) in issue_rows:
        key = report_time.date().isoformat()
        if key in buckets:
            buckets[key]["issues"] += 1

    points: list[TrendPoint] = []
    for key, bucket in buckets.items():
        count = int(bucket["inspections"])
        points.append(
            TrendPoint(
                date=key,
                inspections=count,
                issues=int(bucket["issues"]),
                avg_score=round(bucket["score_sum"] / count, 1) if count else 0.0,
            )
        )
    return points


def district_stats(db: Session) -> list[DistrictStat]:
    restroom_rows = db.execute(
        select(Restroom.district, func.count()).group_by(Restroom.district)
    ).all()
    counts = {district: int(count) for district, count in restroom_rows}
    open_rows = db.execute(
        select(Restroom.district, func.count(Issue.id))
        .join(Issue, Issue.restroom_id == Restroom.id)
        .where(Issue.status.in_(OPEN_ISSUE_STATUSES))
        .group_by(Restroom.district)
    ).all()
    opens = {district: int(count) for district, count in open_rows}
    score_rows = db.execute(
        select(Restroom.district, func.avg(Inspection.score))
        .join(Inspection, Inspection.restroom_id == Restroom.id)
        .group_by(Restroom.district)
    ).all()
    scores = {district: float(avg or 0) for district, avg in score_rows}

    return sorted(
        [
            DistrictStat(
                district=district,
                restroom_count=count,
                issue_open=opens.get(district, 0),
                avg_score=round(scores.get(district, 0.0), 1),
            )
            for district, count in counts.items()
        ],
        key=lambda item: (item.issue_open, -item.avg_score),
        reverse=True,
    )


def restroom_ranking(db: Session, limit: int = 8) -> list[RestroomRankItem]:
    inspections = db.execute(
        select(
            Inspection.restroom_id,
            func.count(Inspection.id),
            func.avg(Inspection.score),
        ).group_by(Inspection.restroom_id)
    ).all()
    stats = {
        rid: {"count": int(count), "avg": round(float(avg or 0), 1)} for rid, count, avg in inspections
    }
    open_rows = db.execute(
        select(Issue.restroom_id, func.count())
        .where(Issue.status.in_(OPEN_ISSUE_STATUSES))
        .group_by(Issue.restroom_id)
    ).all()
    opens = {rid: int(count) for rid, count in open_rows}

    ranking: list[RestroomRankItem] = []
    for restroom in db.scalars(select(Restroom)):
        stat = stats.get(restroom.id, {"count": 0, "avg": 0.0})
        ranking.append(
            RestroomRankItem(
                restroom_id=restroom.id,
                code=restroom.code,
                name=restroom.name,
                district=restroom.district,
                inspection_count=stat["count"],
                avg_score=stat["avg"],
                open_issues=opens.get(restroom.id, 0),
            )
        )
    ranking.sort(key=lambda item: (-item.open_issues, item.avg_score, -item.inspection_count))
    return ranking[:limit]


def dashboard(db: Session, trend_days: int = 14) -> DashboardStats:
    recent_issues, _ = issue_service.list_issues(db, page=1, page_size=5, sort_by="report_time")
    recent_inspections, _ = inspection_service.list_inspections(
        db, page=1, page_size=5, sort_by="inspect_time"
    )
    return DashboardStats(
        overview=overview(db),
        issue_by_status=issue_by_status(db),
        issue_by_category=issue_by_category(db),
        issue_by_severity=issue_by_severity(db),
        inspection_trend=inspection_trend(db, days=trend_days),
        districts=district_stats(db),
        top_restrooms=restroom_ranking(db),
        recent_issues=[issue_service.to_out(issue) for issue in recent_issues],
        recent_inspections=[inspection_service.to_out(item) for item in recent_inspections],
    )
