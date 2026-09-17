"""问题上报与整改跟踪模型。"""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import IssueCategory, IssueSeverity, IssueStatus
from app.core.database import Base


class Issue(Base):
    """巡查或群众反馈发现的问题，需要整改闭环。"""

    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, comment="问题编号")
    restroom_id: Mapped[int] = mapped_column(
        ForeignKey("restrooms.id", ondelete="CASCADE"), index=True, comment="所属公厕"
    )
    inspection_id: Mapped[int | None] = mapped_column(
        ForeignKey("inspections.id", ondelete="SET NULL"), nullable=True, index=True,
        comment="关联巡查记录",
    )
    title: Mapped[str] = mapped_column(String(120), comment="问题标题")
    description: Mapped[str] = mapped_column(Text, default="", comment="问题描述")
    category: Mapped[str] = mapped_column(
        String(30), default=IssueCategory.OTHER.value, index=True, comment="问题分类"
    )
    severity: Mapped[str] = mapped_column(
        String(20), default=IssueSeverity.NORMAL.value, index=True, comment="严重程度"
    )
    status: Mapped[str] = mapped_column(
        String(20), default=IssueStatus.PENDING.value, index=True, comment="整改状态"
    )
    reporter: Mapped[str] = mapped_column(String(60), default="", comment="上报人")
    assignee: Mapped[str] = mapped_column(String(60), default="", comment="整改责任人")
    report_time: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, index=True, comment="上报时间"
    )
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="整改期限")
    images: Mapped[list[str]] = mapped_column(JSON, default=list, comment="现场图片链接")
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, comment="关闭时间")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )

    restroom: Mapped["Restroom"] = relationship(back_populates="issues")  # noqa: F821
    inspection: Mapped["Inspection | None"] = relationship(back_populates="issues")  # noqa: F821
    records: Mapped[list["RectificationRecord"]] = relationship(
        back_populates="issue",
        cascade="all, delete-orphan",
        order_by="RectificationRecord.created_at",
    )


class RectificationRecord(Base):
    """问题整改流水，用于还原完整的整改闭环轨迹。"""

    __tablename__ = "rectification_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    issue_id: Mapped[int] = mapped_column(
        ForeignKey("issues.id", ondelete="CASCADE"), index=True, comment="所属问题"
    )
    action: Mapped[str] = mapped_column(String(30), comment="处理动作")
    from_status: Mapped[str] = mapped_column(String(20), default="", comment="原状态")
    to_status: Mapped[str] = mapped_column(String(20), comment="新状态")
    operator: Mapped[str] = mapped_column(String(60), default="", comment="操作人")
    remark: Mapped[str | None] = mapped_column(Text, nullable=True, comment="处理说明")
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, index=True, comment="操作时间"
    )

    issue: Mapped["Issue"] = relationship(back_populates="records")
