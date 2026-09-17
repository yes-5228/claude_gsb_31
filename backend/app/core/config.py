"""应用配置：所有配置项均可通过环境变量覆盖。"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "公厕保洁巡查记录系统"
    api_prefix: str = "/api/v1"
    debug: bool = False

    # 默认 SQLite，容器中可通过 DATABASE_URL 切换到 PostgreSQL
    database_url: str = "sqlite:///./data/app.db"
    sql_echo: bool = False

    # 允许跨域的前端地址，逗号分隔；* 表示全部放开
    cors_origins: str = "*"

    # 启动时是否写入演示数据
    seed_on_startup: bool = True

    # 分页参数上限
    max_page_size: int = 100

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
