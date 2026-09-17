import { Link } from 'react-router-dom';

import BarList from '../../components/BarList.jsx';
import DataTable from '../../components/DataTable.jsx';
import { ScorePill, SeverityTag, StatusTag } from '../../components/Tags.jsx';
import { formatDateTime } from '../../utils/format.js';

const STATUS_COLORS = {
  待整改: '#dc2626',
  整改中: '#d97706',
  待验收: '#2563eb',
  已完成: '#15803d',
  已关闭: '#94a3b8',
};

export function IssueStatusPanel({ items }) {
  if (!items?.length) return null;
  return (
    <section className="card">
      <div className="card-title">
        <h3>问题整改状态分布</h3>
        <Link className="hint" to="/issues">
          查看全部 →
        </Link>
      </div>
      <BarList
        items={items.map((item) => ({
          name: item.name,
          value: item.value,
          color: STATUS_COLORS[item.name] || '#0f766e',
        }))}
      />
    </section>
  );
}

export function CategoryPanel({ items }) {
  const rows = (items || []).filter((item) => item.total > 0);
  return (
    <section className="card">
      <div className="card-title">
        <h3>问题分类统计</h3>
        <span className="hint">按分类查看未闭环数量</span>
      </div>
      <DataTable
        columns={[
          { key: 'category', title: '问题分类' },
          { key: 'total', title: '累计' },
          { key: 'open', title: '未闭环' },
          { key: 'closed', title: '已闭环' },
          {
            key: 'rate',
            title: '闭环率',
            render: (row) =>
              row.total ? `${Math.round((row.closed / row.total) * 100)}%` : '-',
          },
        ]}
        rows={rows}
        rowKey={(row) => row.category}
        emptyText="暂无问题数据"
      />
    </section>
  );
}

export function DistrictPanel({ items }) {
  return (
    <section className="card">
      <div className="card-title">
        <h3>区域运行情况</h3>
        <span className="hint">按未闭环问题排序</span>
      </div>
      <DataTable
        columns={[
          { key: 'district', title: '区域' },
          { key: 'restroom_count', title: '公厕数' },
          { key: 'issue_open', title: '未闭环' },
          {
            key: 'avg_score',
            title: '巡查均分',
            render: (row) => (row.avg_score ? <ScorePill score={row.avg_score} /> : '-'),
          },
        ]}
        rows={items || []}
        rowKey={(row) => row.district}
        emptyText="暂无区域数据"
      />
    </section>
  );
}

export function RankingPanel({ items }) {
  return (
    <section className="card">
      <div className="card-title">
        <h3>重点关注公厕</h3>
        <span className="hint">未闭环问题多、均分偏低</span>
      </div>
      <DataTable
        columns={[
          {
            key: 'name',
            title: '公厕',
            render: (row) => <Link to={`/restrooms/${row.restroom_id}`}>{row.name}</Link>,
          },
          { key: 'district', title: '区域' },
          { key: 'inspection_count', title: '巡查次数' },
          {
            key: 'avg_score',
            title: '均分',
            render: (row) => (row.avg_score ? <ScorePill score={row.avg_score} /> : '-'),
          },
          { key: 'open_issues', title: '未闭环' },
        ]}
        rows={items || []}
        rowKey={(row) => row.restroom_id}
        emptyText="暂无数据"
      />
    </section>
  );
}

export function RecentIssuesPanel({ items }) {
  return (
    <section className="card">
      <div className="card-title">
        <h3>最新问题上报</h3>
        <Link className="hint" to="/issues">
          查看全部 →
        </Link>
      </div>
      <DataTable
        columns={[
          {
            key: 'title',
            title: '问题',
            wrap: true,
            render: (row) => <Link to={`/issues/${row.id}`}>{row.title}</Link>,
          },
          { key: 'restroom', title: '公厕', render: (row) => row.restroom?.name ?? '-' },
          { key: 'severity', title: '程度', render: (row) => <SeverityTag severity={row.severity} /> },
          { key: 'status', title: '状态', render: (row) => <StatusTag status={row.status} /> },
          { key: 'report_time', title: '上报时间', render: (row) => formatDateTime(row.report_time) },
        ]}
        rows={items || []}
        emptyText="暂无问题"
      />
    </section>
  );
}

export function RecentInspectionsPanel({ items }) {
  return (
    <section className="card">
      <div className="card-title">
        <h3>最新巡查记录</h3>
        <Link className="hint" to="/inspections">
          查看全部 →
        </Link>
      </div>
      <DataTable
        columns={[
          { key: 'restroom', title: '公厕', render: (row) => row.restroom?.name ?? '-' },
          { key: 'inspector', title: '巡查人' },
          { key: 'shift', title: '班次' },
          { key: 'score', title: '得分', render: (row) => <ScorePill score={row.score} /> },
          { key: 'result', title: '结论', render: (row) => <StatusTag status={row.result} /> },
          { key: 'inspect_time', title: '巡查时间', render: (row) => formatDateTime(row.inspect_time) },
        ]}
        rows={items || []}
        emptyText="暂无巡查记录"
      />
    </section>
  );
}
