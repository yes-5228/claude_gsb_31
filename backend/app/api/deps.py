"""API 依赖：分页、过滤参数等。"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query

from app.schemas.common import PageMeta


@dataclass(slots=True)
class Pagination:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def get_pagination(
    page: Annotated[int, Query(ge=1, description="页码，从 1 开始")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="每页数量")] = 10,
) -> Pagination:
    return Pagination(page=page, page_size=page_size)


def build_meta(total: int, pagination: Pagination) -> PageMeta:
    pages = (total + pagination.page_size - 1) // pagination.page_size if total else 0
    return PageMeta(
        total=total, page=pagination.page, page_size=pagination.page_size, pages=pages
    )


PaginationDep = Annotated[Pagination, Depends(get_pagination)]
