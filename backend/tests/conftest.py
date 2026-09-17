"""测试夹具：使用独立的 SQLite 文件，避免污染开发数据。"""

import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

TEST_DB = BACKEND_DIR / "data" / "test_app.db"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["SEED_ON_STARTUP"] = "false"
os.environ["CORS_ORIGINS"] = "*"

if TEST_DB.exists():
    TEST_DB.unlink()

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def restroom(client) -> dict:
    response = client.post(
        "/api/v1/restrooms",
        json={
            "name": "测试公厕",
            "district": "测试区",
            "address": "测试路 1 号",
            "grade": "二类",
            "status": "正常开放",
            "manager": "测试员",
            "stall_count": 6,
            "basin_count": 3,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def full_items(score: float = 9.0) -> list[dict]:
    from app.core.constants import INSPECTION_CHECK_ITEMS

    return [{"name": name, "score": score} for name in INSPECTION_CHECK_ITEMS]
