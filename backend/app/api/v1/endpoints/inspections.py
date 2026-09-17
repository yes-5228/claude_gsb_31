"""保洁巡查记录接口。"""

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import PaginationDep, build_meta
from app.core.database import get_db
from app.schemas.common import MessageOut, Page
from app.schemas.inspection import InspectionCreate, InspectionOut, InspectionUpdate
from app.services import inspection_service

router = APIRouter(prefix="/inspections", tags=["保洁巡查"])


@router.get("", response_model=Page[InspectionOut], summary="巡查记录列表")
def list_inspections(
    db: Annotated[Session, Depends(get_db)],
    pagination: PaginationDep,
    restroom_id: Annotated[int | None, Query(description="按公厕过滤")] = None,
    district: Annotated[str | None, Query(description="按区域过滤")] = None,
    inspector: Annotated[str | None, Query(description="巡查人")] = None,
    shift: Annotated[str | None, Query(description="班次")] = None,
    result: Annotated[str | None, Query(description="巡查结论")] = None,
    keyword: Annotated[str | None, Query(description="公厕名称/备注模糊搜索")] = None,
    date_from: Annotated[date | None, Query(description="开始日期")] = None,
    date_to: Annotated[date | None, Query(description="结束日期")] = None,
    sort_by: Annotated[str, Query(description="排序字段")] = "inspect_time",
    order: Annotated[str, Query(pattern="^(asc|desc)$")] = "desc",
) -> Page[InspectionOut]:
    rows, total = inspection_service.list_inspections(
        db,
        restroom_id=restroom_id,
        district=district,
        inspector=inspector,
        shift=shift,
        result=result,
        keyword=keyword,
        date_from=date_from,
        date_to=date_to,
        page=pagination.page,
        page_size=pagination.page_size,
        sort_by=sort_by,
        order=order,
    )
    return Page[InspectionOut](
        items=[inspection_service.to_out(row) for row in rows],
        meta=build_meta(total, pagination),
    )


@router.post("", response_model=InspectionOut, status_code=201, summary="新增巡查记录")
def create_inspection(
    payload: InspectionCreate, db: Annotated[Session, Depends(get_db)]
) -> InspectionOut:
    return inspection_service.to_out(inspection_service.create_inspection(db, payload))


@router.get("/{inspection_id}", response_model=InspectionOut, summary="巡查记录详情")
def get_inspection(inspection_id: int, db: Annotated[Session, Depends(get_db)]) -> InspectionOut:
    return inspection_service.to_out(inspection_service.get_inspection(db, inspection_id))


@router.patch("/{inspection_id}", response_model=InspectionOut, summary="更新巡查记录")
def update_inspection(
    inspection_id: int, payload: InspectionUpdate, db: Annotated[Session, Depends(get_db)]
) -> InspectionOut:
    return inspection_service.to_out(
        inspection_service.update_inspection(db, inspection_id, payload)
    )


@router.delete("/{inspection_id}", response_model=MessageOut, summary="删除巡查记录")
def delete_inspection(
    inspection_id: int, db: Annotated[Session, Depends(get_db)]
) -> MessageOut:
    inspection_service.delete_inspection(db, inspection_id)
    return MessageOut(message="删除成功")
