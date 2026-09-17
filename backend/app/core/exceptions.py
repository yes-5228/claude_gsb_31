"""业务异常：由 service 层抛出，由 API 层转换为统一错误响应。"""


class DomainError(Exception):
    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundError(DomainError):
    def __init__(self, message: str = "资源不存在") -> None:
        super().__init__(message, status_code=404)


class ConflictError(DomainError):
    def __init__(self, message: str = "存在关联数据，操作被拒绝") -> None:
        super().__init__(message, status_code=409)
