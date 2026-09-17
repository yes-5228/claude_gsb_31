import { formatShortDate } from '../utils/format.js';

export default function TrendChart({ points }) {
  if (!points?.length) return <div className="empty-block">暂无趋势数据</div>;

  const maxInspections = Math.max(...points.map((point) => point.inspections), 1);
  const maxIssues = Math.max(...points.map((point) => point.issues), 1);
  const scale = Math.max(maxInspections, maxIssues);

  return (
    <>
      <div className="trend-chart">
        {points.map((point) => (
          <div className="trend-col" key={point.date} title={`${point.date} 巡查 ${point.inspections} 次，问题 ${point.issues} 条，均分 ${point.avg_score}`}>
            <div className="trend-bars">
              <div
                className="trend-bar"
                style={{ height: `${(point.inspections / scale) * 100}%` }}
              />
              <div
                className="trend-bar issues"
                style={{ height: `${(point.issues / scale) * 100}%` }}
              />
            </div>
            <span className="trend-label">{formatShortDate(point.date)}</span>
          </div>
        ))}
      </div>
      <div className="legend">
        <span>巡查次数</span>
        <span className="issues">新增问题</span>
      </div>
    </>
  );
}
