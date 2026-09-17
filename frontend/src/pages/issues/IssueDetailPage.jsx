import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { issueApi } from '../../api/issues.js';
import DetailList from '../../components/DetailList.jsx';
import Field from '../../components/Field.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import { OverdueTag, SeverityTag, StatusTag } from '../../components/Tags.jsx';
import Timeline from '../../components/Timeline.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { formatDateTime } from '../../utils/format.js';
import IssueActionModal from './IssueActionModal.jsx';
import IssueEditModal from './IssueEditModal.jsx';

export default function IssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [activeOption, setActiveOption] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progressError, setProgressError] = useState(null);
  const [progress, setProgress] = useState({
    action: '整改进度',
    operator: '',
    remark: '',
  });

  const { data: issue, loading, error, reload } = useAsync(
    () => issueApi.detail(issueId),
    [issueId],
  );
  const { data: options } = useAsync(() => issueApi.transitions(issueId), [issueId]);

  const submitTransition = async (payload) => {
    setSaving(true);
    try {
      await issueApi.changeStatus(issueId, payload);
      toast.success('整改状态已更新');
      setActiveOption(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitProgress = async (event) => {
    event.preventDefault();
    if (!progress.operator.trim()) {
      setProgressError('请填写操作人');
      return;
    }
    setProgressError(null);
    try {
      await issueApi.addRecord(issueId, {
        action: progress.action || '整改进度',
        operator: progress.operator.trim(),
        remark: progress.remark || null,
      });
      toast.success('已追加整改记录');
      setProgress({ action: progress.action, operator: progress.operator, remark: '' });
      reload();
    } catch (err) {
      setProgressError(err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm('确认删除该问题及其整改记录？')) return;
    try {
      await issueApi.remove(issueId);
      toast.success('已删除');
      navigate('/issues');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <PageHeader
        title={issue ? `问题 ${issue.code}` : '问题详情'}
        description={issue?.title}
        actions={
          <>
            <Link className="btn" to="/issues">
              返回列表
            </Link>
            <button type="button" className="btn" onClick={() => setShowEdit(true)}>
              编辑信息
            </button>
            <button type="button" className="btn btn-danger" onClick={remove}>
              删除
            </button>
          </>
        }
      />
      <div className="content">
        {error ? <div className="alert alert-error">{error.message}</div> : null}
        {loading && !issue ? <div className="loading-block">加载中...</div> : null}

        {issue ? (
          <>
            <section className="card">
              <div className="card-title">
                <div className="inline">
                  <h3>{issue.title}</h3>
                  <StatusTag status={issue.status} />
                  <SeverityTag severity={issue.severity} />
                  <OverdueTag deadline={issue.deadline} status={issue.status} />
                </div>
                <span className="hint">最后更新：{formatDateTime(issue.updated_at)}</span>
              </div>
              <DetailList
                items={[
                  {
                    label: '所属公厕',
                    value: issue.restroom ? (
                      <Link to={`/restrooms/${issue.restroom.id}`}>
                        {issue.restroom.name}（{issue.restroom.district}）
                      </Link>
                    ) : (
                      '-'
                    ),
                  },
                  { label: '问题分类', value: issue.category },
                  {
                    label: '上报人 / 时间',
                    value: `${issue.reporter || '-'} · ${formatDateTime(issue.report_time)}`,
                  },
                  { label: '整改责任人', value: issue.assignee || '未指派' },
                  { label: '整改期限', value: formatDateTime(issue.deadline) },
                  {
                    label: '关联巡查记录',
                    value: issue.inspection_id ? `#${issue.inspection_id}` : '无',
                  },
                  { label: '闭环时间', value: formatDateTime(issue.closed_at) },
                  { label: '问题描述', value: issue.description || '无' },
                ]}
              />
            </section>

            <section className="card">
              <div className="card-title">
                <h3>整改流转</h3>
                <span className="hint">按流程推进，越级操作会被服务端拒绝</span>
              </div>
              {options?.length ? (
                <div className="action-group">
                  {options.map((option) => (
                    <button
                      key={option.status}
                      type="button"
                      className={`btn${option.status === '已完成' ? ' btn-primary' : ''}`}
                      onClick={() => setActiveOption(option)}
                    >
                      {option.action}（变更为「{option.status}」）
                    </button>
                  ))}
                </div>
              ) : (
                <div className="alert alert-info">该问题已关闭，整改流程结束。</div>
              )}

              {issue.status !== '已关闭' ? (
                <form className="form-grid" style={{ marginTop: 18 }} onSubmit={submitProgress}>
                  <Field label="记录类型">
                    <select
                      value={progress.action}
                      onChange={(event) =>
                        setProgress((prev) => ({ ...prev, action: event.target.value }))
                      }
                    >
                      <option>整改进度</option>
                      <option>现场核查</option>
                      <option>协调处理</option>
                    </select>
                  </Field>
                  <Field label="操作人 *">
                    <input
                      value={progress.operator}
                      onChange={(event) =>
                        setProgress((prev) => ({ ...prev, operator: event.target.value }))
                      }
                      placeholder="不改变状态，仅追加跟进记录"
                    />
                  </Field>
                  <Field label="说明" full>
                    <textarea
                      rows="2"
                      value={progress.remark}
                      onChange={(event) =>
                        setProgress((prev) => ({ ...prev, remark: event.target.value }))
                      }
                    />
                  </Field>
                  {progressError ? (
                    <div className="alert alert-error full">{progressError}</div>
                  ) : null}
                  <div className="full">
                    <button type="submit" className="btn">
                      追加整改记录
                    </button>
                  </div>
                </form>
              ) : null}
            </section>

            <section className="card">
              <div className="card-title">
                <h3>整改轨迹</h3>
                <span className="hint">共 {issue.records.length} 条记录</span>
              </div>
              <Timeline records={issue.records} />
            </section>
          </>
        ) : null}
      </div>

      {activeOption && issue ? (
        <IssueActionModal
          option={activeOption}
          issue={issue}
          saving={saving}
          onClose={() => setActiveOption(null)}
          onSubmit={submitTransition}
        />
      ) : null}

      {showEdit && issue ? (
        <IssueEditModal issue={issue} onClose={() => setShowEdit(false)} onSaved={reload} />
      ) : null}
    </>
  );
}
