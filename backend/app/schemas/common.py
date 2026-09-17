"""通用响应结构。"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class PageMeta(BaseModel):
    total: int = Field(description="总记录数")
    page: int = Field(description="当前页码")
    page_size: int = Field(description="每页数量")
    pages: int = Field(description="总页数")


class Page(BaseModel, Generic[T]):
    items: list[T]
    meta: PageMeta


class MessageOut(BaseModel):
    message: str
