export const DEFAULT_MAX_SCORE = 10;

export function calcScore(items, maxScore = DEFAULT_MAX_SCORE) {
  if (!items?.length) return 0;
  const total = items.reduce((sum, item) => sum + Number(item.score || 0), 0);
  return Math.round((total / (items.length * maxScore)) * 1000) / 10;
}

export function gradeOf(score) {
  if (score >= 90) return '优秀';
  if (score >= 80) return '良好';
  if (score >= 70) return '合格';
  return '不合格';
}

export function resultOf(items, score) {
  const hasProblem = items.some((item) => Number(item.score) < 6);
  return hasProblem || gradeOf(score) === '不合格' ? '发现问题' : '正常';
}
