"""巡查评分规则。"""

from app.core.constants import (
    GRADE_EXCELLENT,
    GRADE_FAIL,
    GRADE_GOOD,
    GRADE_PASS,
    INSPECTION_ITEM_MAX_SCORE,
    INSPECTION_ITEM_PROBLEM_THRESHOLD,
    InspectionResult,
)


def calc_score(items: list[dict]) -> float:
    """按检查项平均得分换算成百分制。"""
    if not items:
        return 0.0
    total = sum(float(item["score"]) for item in items)
    full = len(items) * INSPECTION_ITEM_MAX_SCORE
    return round(total / full * 100, 1)


def score_to_grade(score: float) -> str:
    if score >= 90:
        return GRADE_EXCELLENT
    if score >= 80:
        return GRADE_GOOD
    if score >= 70:
        return GRADE_PASS
    return GRADE_FAIL


def is_abnormal(items: list[dict]) -> bool:
    """存在低于合格线的检查项即判定为发现问题。"""
    return any(float(item["score"]) < INSPECTION_ITEM_PROBLEM_THRESHOLD for item in items)


def build_result(items: list[dict], score: float) -> str:
    if is_abnormal(items) or score_to_grade(score) == GRADE_FAIL:
        return InspectionResult.ABNORMAL.value
    return InspectionResult.NORMAL.value


def evaluate(items: list[dict]) -> tuple[float, str, str]:
    """返回 (得分, 等级, 巡查结论)。"""
    score = calc_score(items)
    return score, score_to_grade(score), build_result(items, score)


def problem_items(items: list[dict]) -> list[dict]:
    return [item for item in items if float(item["score"]) < INSPECTION_ITEM_PROBLEM_THRESHOLD]
