import { useState } from 'react';

import { statsApi } from '../../api/stats.js';
import BarList from '../../components/BarList.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import StatCard from '../../components/StatCard.jsx';
import TrendChart from '../../components/TrendChart.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import {
  CategoryPanel,
  DistrictPanel,
  IssueStatusPanel,
  RankingPanel,
  RecentInspectionsPanel,
  RecentIssuesPanel,
} from './DashboardPanels.jsx';

const RANGE_OPTIONS = [7, 14, 30];

export default function DashboardPage() {
  const [trendDays, setTrendDays] = useState(14);
  const { data, loading, error } = useAsync(
    () => statsApi.dashboard(trendDays),
    [trendDays],
  );

  const overview = data?.overview;

  return (
    <>
      <PageHeader
        title="总览看板"
        description="公厕保洁巡查与问题整改的整体运行情况"
        actions={
          <div className="field" style={{ minWidth: 130 }}>
            <label>统计区间</label>
            <select value={trendDays} onChange={(event) => setTrendDays(Number(event.target.value))}>
              {RANGE_OPTIONS.map((days) => (
                <option key={days} value={days}>
                  近 {days} 天
                </option>
              ))}
            </select>
          </div>
        }
      />
      <div className="content">
        {error ? <div className="alert alert-error">{error.message}</div> : null}
        {loading && !data ? <div className="loading-block">看板数据加载中…</div> : null}

        {overview ? (
          <>
            <div className="stat-grid">
              <StatCard
                label="在册公厕"
                value={overview.restroom_total}
                unit="座"
                foot={`正常开放 ${overview.restroom_open} 座 · 维修 ${overview.restroom_maintenance} 座`}
              />
              <StatCard
                label="巡查记录总数"
                value={overview.inspection_total}
                unit="条"
                tone="info"
                foot={`今日 ${overview.inspection_today} 条 · 近 7 日 ${overview.inspection_week} 条`}
              />
              <StatCard
                label="近 7 日均分"
                value={overview.avg_score_week.toFixed(1)}
                unit="分"
                tone={overview.avg_score_week >= 85 ? 'primary' : 'warning'}
                foot="按百分制折算"
              />
              <StatCard
                label="未闭环问题"
                value={overview.issue_open}
                unit="条"
                tone={overview.issue_open > 0 ? 'danger' : 'primary'}
                foot={`累计上报 ${overview.issue_total} 条`}
              />
              <StatCard
                label="超期未整改"
                value={overview.issue_overdue}
                unit="条"
                tone={overview.issue_overdue > 0 ? 'danger' : 'primary'}
                foot="超过整改期限仍未闭环"
              />
              <StatCard
                label="整改闭环率"
                value={overview.rectification_rate.toFixed(1)}
                unit="%"
                tone="info"
                foot={`本月完成 ${overview.issue_done_this_month} 条`}
              />
            </div>

            <div className="grid-2">
              <section className="card">
                <div className="card-title">
                  <h3>巡查与问题趋势</h3>
                  <span className="hint">近 {trendDays} 天</span>
                </div>
                <TrendChart points={data.inspection_trend} />
              </section>
              <IssueStatusPanel items={data.issue_by_status} />
            </div>

            <div className="grid-2">
              <CategoryPanel items={data.issue_by_category} />
              <section className="card">
                <div className="card-title">
                  <h3>问题严重程度分布</h3>
                </div>
                <BarList
                  items={data.issue_by_severity.map((item) => ({
                    name: item.name,
                    value: item.value,
                    color: item.name === '紧急' ? '#dc2626' : item.name === '严重' ? '#d97706' : '#64748b',
                  }))}
                />
              </section>
            </div>

            <div className="grid-2">
              <DistrictPanel items={data.districts} />
              <RankingPanel items={data.top_restrooms} />
            </div>

            <div className="grid-2">
              <RecentIssuesPanel items={data.recent_issues} />
              <RecentInspectionsPanel items={data.recent_inspections} />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
