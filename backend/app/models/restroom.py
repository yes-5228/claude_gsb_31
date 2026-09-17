"""公厕台账模型。"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.constants import RestroomGrade, RestroomStatus
from app.core.database import Base


class Restroom(Base):
    """公厕基础档案。"""

    __tablename__ = "restrooms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True, comment="公厕编号")
    name: Mapped[str] = mapped_column(String(120), index=True, comment="公厕名称")
    district: Mapped[str] = mapped_column(String(60), index=True, comment="所属区域")
    address: Mapped[str] = mapped_column(String(200), comment="详细地址")
    grade: Mapped[str] = mapped_column(
        String(20), default=RestroomGrade.SECOND.value, comment="公厕等级"
    )
    status: Mapped[str] = mapped_column(
        String(20), default=RestroomStatus.NORMAL.value, index=True, comment="开放状态"
    )
    manager: Mapped[str] = mapped_column(String(60), comment="保洁责任人")
    manager_phone: Mapped[str] = mapped_column(String(30), default="", comment="联系电话")
    open_hours: Mapped[str] = mapped_column(String(60), default="06:00-22:00", comment="开放时间")
    stall_count: Mapped[int] = mapped_column(Integer, default=0, comment="蹲位数量")
    basin_count: Mapped[int] = mapped_column(Integer, default=0, comment="洗手盆数量")
    has_accessible: Mapped[bool] = mapped_column(Boolean, default=True, comment="是否有无障碍设施")
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True, comment="经度")
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True, comment="纬度")
    remark: Mapped[str | None] = mapped_column(Text, nullable=True, comment="备注")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, comment="创建时间")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now, comment="更新时间"
    )

    inspections: Mapped[list["Inspection"]] = relationship(  # noqa: F821
        back_populates="restroom", cascade="all, delete-orphan"
    )
    issues: Mapped[list["Issue"]] = relationship(  # noqa: F821
        back_populates="restroom", cascade="all, delete-orphan"
    )
