"""接口级测试：覆盖台账、巡查、问题整改与统计看板。"""

from datetime import datetime, timedelta

from tests.conftest import full_items


def test_health_and_dictionaries(client):
    assert client.get("/health").json()["status"] == "ok"
    payload = client.get("/api/v1/meta/dictionaries").json()
    assert "待整改" in payload["issue_status"]
    assert len(payload["inspection_check_items"]) == 8
    assert payload["issue_transitions"]["待整改"] == ["整改中", "已关闭"]


def test_restroom_crud_and_delete_guard(client, restroom):
    assert restroom["code"].startswith("WC-")

    listed = client.get("/api/v1/restrooms", params={"district": "测试区"}).json()
    assert listed["meta"]["total"] >= 1

    detail = client.get(f"/api/v1/restrooms/{restroom['id']}").json()
    assert detail["inspection_count"] == 0
    assert detail["open_issue_count"] == 0

    updated = client.patch(
        f"/api/v1/restrooms/{restroom['id']}", json={"status": "维修中", "manager": "新责任人"}
    ).json()
    assert updated["status"] == "维修中"
    assert updated["manager"] == "新责任人"

    # 存在关联数据时不允许直接删除
    client.post(
        "/api/v1/inspections",
        json={
            "restroom_id": restroom["id"],
            "inspector": "测试巡查员",
            "shift": "早班",
            "items": full_items(9),
        },
    )
    blocked = client.delete(f"/api/v1/restrooms/{restroom['id']}")
    assert blocked.status_code == 409

    ok = client.delete(f"/api/v1/restrooms/{restroom['id']}", params={"force": "true"})
    assert ok.status_code == 200
    assert client.get(f"/api/v1/restrooms/{restroom['id']}").status_code == 404


def test_inspection_scoring_and_filter(client, restroom):
    good = client.post(
        "/api/v1/inspections",
        json={
            "restroom_id": restroom["id"],
            "inspector": "李巡查",
            "shift": "中班",
            "items": full_items(9),
            "remark": "整体良好",
        },
    ).json()
    assert good["score"] == 90.0
    assert good["grade"] == "优秀"
    assert good["result"] == "正常"

    bad_items = full_items(9)
    bad_items[0]["score"] = 3
    bad_items[0]["remark"] = "地面污渍"
    bad = client.post(
        "/api/v1/inspections",
        json={
            "restroom_id": restroom["id"],
            "inspector": "李巡查",
            "shift": "晚班",
            "items": bad_items,
        },
    ).json()
    assert bad["result"] == "发现问题"
    assert bad["score"] < 90

    filtered = client.get(
        "/api/v1/inspections", params={"result": "发现问题", "restroom_id": restroom["id"]}
    ).json()
    assert filtered["meta"]["total"] == 1
    assert filtered["items"][0]["id"] == bad["id"]
    assert filtered["items"][0]["restroom"]["name"] == restroom["name"]

    today = datetime.now().date().isoformat()
    ranged = client.get(
        "/api/v1/inspections", params={"date_from": today, "date_to": today}
    ).json()
    assert ranged["meta"]["total"] == 2

    duplicate = full_items(5) + [{"name": "地面与台阶清洁", "score": 4}]
    rejected = client.post(
        "/api/v1/inspections",
        json={"restroom_id": restroom["id"], "inspector": "李巡查", "items": duplicate},
    )
    assert rejected.status_code == 400

    empty = client.post(
        "/api/v1/inspections",
        json={"restroom_id": restroom["id"], "inspector": "李巡查", "items": []},
    )
    assert empty.status_code == 422


def test_issue_lifecycle(client, restroom):
    inspection = client.post(
        "/api/v1/inspections",
        json={
            "restroom_id": restroom["id"],
            "inspector": "王巡查",
            "items": full_items(4),
        },
    ).json()

    issue = client.post(
        "/api/v1/issues",
        json={
            "restroom_id": restroom["id"],
            "inspection_id": inspection["id"],
            "title": "地面污渍未清理",
            "description": "巡查发现地面有明显污渍",
            "category": "保洁不到位",
            "severity": "严重",
            "reporter": "王巡查",
            "assignee": "保洁班组",
            "deadline": (datetime.now() - timedelta(days=1)).isoformat(),
        },
    ).json()
    assert issue["status"] == "待整改"
    assert len(issue["records"]) == 1
    assert issue["records"][0]["action"] == "上报问题"

    # 越级流转被拒绝：待整改 -> 已完成
    invalid = client.post(
        f"/api/v1/issues/{issue['id']}/transitions",
        json={"to_status": "已完成", "operator": "值班长"},
    )
    assert invalid.status_code == 400
    assert "不允许流转" in invalid.json()["detail"]

    options = client.get(f"/api/v1/issues/{issue['id']}/transitions").json()
    assert {option["status"] for option in options} == {"整改中", "已关闭"}

    processing = client.post(
        f"/api/v1/issues/{issue['id']}/transitions",
        json={"to_status": "整改中", "operator": "保洁班组张伟", "remark": "已安排清洗"},
    ).json()
    assert processing["status"] == "整改中"
    assert processing["assignee"] == "保洁班组"

    reviewing = client.post(
        f"/api/v1/issues/{issue['id']}/transitions",
        json={"to_status": "待验收", "operator": "保洁班组张伟", "remark": "整改完成待验收"},
    ).json()
    assert reviewing["status"] == "待验收"

    # 验收驳回回到整改中
    rejected = client.post(
        f"/api/v1/issues/{issue['id']}/transitions",
        json={"to_status": "整改中", "operator": "王巡查", "remark": "角落仍有残留"},
    ).json()
    assert rejected["status"] == "整改中"
    assert rejected["records"][-1]["action"] == "验收驳回"

    for target in ("待验收", "已完成", "已关闭"):
        payload = {"to_status": target, "operator": "值班长", "remark": f"流转到{target}"}
        response = client.post(f"/api/v1/issues/{issue['id']}/transitions", json=payload)
        assert response.status_code == 200, response.text
    final = response.json()
    assert final["status"] == "已关闭"
    assert final["closed_at"] is not None
    assert [record["to_status"] for record in final["records"]][-1] == "已关闭"

    closed_record = client.post(
        f"/api/v1/issues/{issue['id']}/records",
        json={"action": "整改进度", "operator": "值班长", "remark": "补充说明"},
    )
    assert closed_record.status_code == 400

    overdue = client.get("/api/v1/issues", params={"overdue": "true"}).json()
    assert overdue["meta"]["total"] == 0

    # 巡查记录可反查关联问题数量
    detail = client.get(f"/api/v1/inspections/{inspection['id']}").json()
    assert detail["issue_count"] == 1


def test_issue_requires_matching_restroom(client, restroom):
    other = client.post(
        "/api/v1/restrooms",
        json={"name": "另一座公厕", "district": "测试区", "address": "测试路 2 号"},
    ).json()
    inspection = client.post(
        "/api/v1/inspections",
        json={"restroom_id": other["id"], "inspector": "周巡查", "items": full_items(9)},
    ).json()
    mismatch = client.post(
        "/api/v1/issues",
        json={
            "restroom_id": restroom["id"],
            "inspection_id": inspection["id"],
            "title": "关联错误",
        },
    )
    assert mismatch.status_code == 400
    assert "不一致" in mismatch.json()["detail"]


def test_issue_code_continues_after_delete(client, restroom):
    created = []
    for index in range(3):
        response = client.post(
            "/api/v1/issues",
            json={"restroom_id": restroom["id"], "title": f"编号连续性{index}"},
        )
        assert response.status_code == 201, response.text
        created.append(response.json())

    prefix = datetime.now().strftime("WT-%Y%m%d-")
    assert all(item["code"].startswith(prefix) for item in created)
    seqs = [int(item["code"].rsplit("-", 1)[1]) for item in created]
    assert seqs == [seqs[0], seqs[0] + 1, seqs[0] + 2]

    # 删掉最新一条后再建：不复用已释放的编号，也不因条数减少而跳号
    assert client.delete(f"/api/v1/issues/{created[2]['id']}").status_code == 200
    for expected in (seqs[2] + 1, seqs[2] + 2):
        response = client.post(
            "/api/v1/issues", json={"restroom_id": restroom["id"], "title": "删除后再建"}
        )
        assert response.status_code == 201, response.text
        assert response.json()["code"] == f"{prefix}{expected:03d}"

    # 历史编号保持不变
    remaining = client.get(f"/api/v1/issues/{created[0]['id']}").json()
    assert remaining["code"] == created[0]["code"]


def test_issue_code_follows_report_time(client, restroom):
    biz_time = (datetime.now() - timedelta(days=1)).replace(hour=23, minute=58)
    first = client.post(
        "/api/v1/issues",
        json={
            "restroom_id": restroom["id"],
            "title": "跨零点补录一",
            "report_time": biz_time.isoformat(),
        },
    )
    assert first.status_code == 201, first.text
    prefix = biz_time.strftime("WT-%Y%m%d-")
    assert first.json()["code"].startswith(prefix)

    second = client.post(
        "/api/v1/issues",
        json={
            "restroom_id": restroom["id"],
            "title": "跨零点补录二",
            "report_time": biz_time.replace(minute=59).isoformat(),
        },
    )
    assert second.status_code == 201, second.text
    first_seq = int(first.json()["code"].rsplit("-", 1)[1])
    second_seq = int(second.json()["code"].rsplit("-", 1)[1])
    assert second_seq == first_seq + 1


def test_issue_code_concurrent_allocation(client, restroom):
    from concurrent.futures import ThreadPoolExecutor

    from app.core.database import SessionLocal
    from app.schemas.issue import IssueCreate
    from app.services import issue_service

    def create_one(index: int) -> str:
        db = SessionLocal()
        try:
            issue = issue_service.create_issue(
                db, IssueCreate(restroom_id=restroom["id"], title=f"并发上报{index}")
            )
            return issue.code
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(create_one, range(8)))

    # 并发提交：编号不重复、序号连续不漏号
    assert len(set(codes)) == 8
    prefix = datetime.now().strftime("WT-%Y%m%d-")
    assert all(code.startswith(prefix) for code in codes)
    seqs = sorted(int(code.rsplit("-", 1)[1]) for code in codes)
    assert seqs == list(range(seqs[0], seqs[0] + 8))


def test_dashboard_stats(client, restroom):
    payload = client.get("/api/v1/stats/dashboard", params={"trend_days": 7}).json()
    overview = payload["overview"]
    assert overview["restroom_total"] >= 1
    assert overview["inspection_total"] >= 1
    assert len(payload["inspection_trend"]) == 7
    assert {item["name"] for item in payload["issue_by_status"]} == {
        "待整改",
        "整改中",
        "待验收",
        "已完成",
        "已关闭",
    }
    assert payload["top_restrooms"]
    assert "rectification_rate" in overview
