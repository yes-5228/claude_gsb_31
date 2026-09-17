import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { inspectionApi } from '../../api/inspections.js';
import { restroomApi } from '../../api/restrooms.js';
import DataTable from '../../components/DataTable.jsx';
import Field from '../../components/Field.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import { GradeTag, ScorePill, StatusTag } from '../../components/Tags.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { useDictionaries } from '../../hooks/useDictionaries.js';
import { useListQuery } from '../../hooks/useListQuery.js';
import { formatDateTime } from '../../utils/format.js';
import InspectionDetailModal from './InspectionDetailModal.jsx';
import InspectionFormModal from './InspectionFormModal.jsx';

const DEFAULT_FILTERS = {
  keyword: '',
  district: '',
  shift: '',
  result: '',
  date_from: '',
  date_to: '',
};

export default function InspectionListPage() {
  const { dictionaries } = useDictionaries();
  const toast = useToast();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [active, setActive] = useState(null);

  const list = useListQuery((params) => inspectionApi.list(params), DEFAULT_FILTERS, 10);
  const { data: districts } = useAsync(() => restroomApi.districts(), []);

  const remove = async (row) => {
    if (!window.confirm('确认删除该条巡查记录？关联的问题记录不会被删除。')) return;
    try {
      await inspectionApi.remove(row.id);
      toast.success('删除成功');
      list.reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title="保洁巡查记录"
        description="按班次记录保洁质量评分，自动折算百分制得分并判定是否异常"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + 新增巡查记录
          </button>
        }
      />
      <div className="content">
        <section className="card">
          <div className="filter-bar">
            <Field label="关键字" full>
              <input
                value={list.filters.keyword}
                placeholder="公厕名称 / 巡查备注"
                onChange={(event) => list.updateFilter('keyword', event.target.value)}
              />
            </Field>
            <Field label="所属区域">
              <select
                value={list.filters.district}
                onChange={(event) => list.updateFilter('district', event.target.value)}
              >
                <option value="">全部</option>
                {(districts || []).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="班次">
              <select
                value={list.filters.shift}
                onChange={(event) => list.updateFilter('shift', event.target.value)}
              >
                <option value="">全部</option>
                {(dictionaries?.shift || []).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="巡查结论">
              <select
                value={list.filters.result}
                onChange={(event) => list.updateFilter('result', event.target.value)}
              >
                <option value="">全部</option>
                <option value="正常">正常</option>
                <option value="发现问题">发现问题</option>
              </select>
            </Field>
            <Field label="开始日期">
              <input
                type="date"
                value={list.filters.date_from}
                onChange={(event) => list.updateFilter('date_from', event.target.value)}
              />
            </Field>
            <Field label="结束日期">
              <input
                type="date"
                value={list.filters.date_to}
                onChange={(event) => list.updateFilter('date_to', event.target.value)}
              />
            </Field>
            <button type="button" className="btn" onClick={list.resetFilters}>
              重置
            </button>
          </div>
        </section>

        <section className="card">
          <DataTable
            loading={list.loading}
            error={list.error}
            rows={list.items}
            emptyText="暂无巡查记录"
            columns={[
              {
                key: 'inspect_time',
                title: '巡查时间',
                render: (row) => formatDateTime(row.inspect_time),
              },
              {
                key: 'restroom',
                title: '公厕',
                render: (row) =>
                  row.restroom ? (
                    <Link to={`/restrooms/${row.restroom.id}`}>{row.restroom.name}</Link>
                  ) : (
                    '-'
                  ),
              },
              { key: 'district', title: '区域', render: (row) => row.restroom?.district ?? '-' },
              { key: 'inspector', title: '巡查人' },
              { key: 'shift', title: '班次' },
              { key: 'score', title: '得分', render: (row) => <ScorePill score={row.score} /> },
              { key: 'grade', title: '等级', render: (row) => <GradeTag grade={row.grade} /> },
              { key: 'result', title: '结论', render: (row) => <StatusTag status={row.result} /> },
              { key: 'issue_count', title: '关联问题' },
              {
                key: 'actions',
                title: '操作',
                render: (row) => (
                  <div className="inline">
                    <button type="button" className="btn-link" onClick={() => setActive(row)}>
                      详情
                    </button>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() =>
                        navigate(
                          `/issues?createFromInspection=${row.id}&restroomId=${row.restroom_id}`,
                        )
                      }
                    >
                      上报问题
                    </button>
                    <button type="button" className="btn-link danger" onClick={() => remove(row)}>
                      删除
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination meta={list.meta} onPageChange={list.setPage} />
        </section>
      </div>

      {showForm ? (
        <InspectionFormModal onClose={() => setShowForm(false)} onSaved={list.reload} />
      ) : null}

      {active ? (
        <InspectionDetailModal
          inspection={active}
          onClose={() => setActive(null)}
          onReportIssue={(inspection) =>
            navigate(
              `/issues?createFromInspection=${inspection.id}&restroomId=${inspection.restroom_id}`,
            )
          }
        />
      ) : null}
    </>
  );
}
