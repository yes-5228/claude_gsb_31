import { useEffect, useState } from 'react';

import { inspectionApi } from '../../api/inspections.js';
import { issueApi } from '../../api/issues.js';
import { metaApi } from '../../api/meta.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useDictionaries } from '../../hooks/useDictionaries.js';
import { toDateTimeInput } from '../../utils/format.js';

export default function IssueFormModal({
  defaultRestroomId,
  defaultInspectionId,
  onClose,
  onSaved,
}) {
  const { dictionaries } = useDictionaries();
  const toast = useToast();
  const [restrooms, setRestrooms] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    restroom_id: defaultRestroomId ? Number(defaultRestroomId) : '',
    inspection_id: defaultInspectionId ? Number(defaultInspectionId) : '',
    title: '',
    description: '',
    category: '保洁不到位',
    severity: '一般',
    reporter: '',
    assignee: '',
    deadline: toDateTimeInput(new Date(Date.now() + 3 * 24 * 3600 * 1000)),
    initial_remark: '',
  });

  useEffect(() => {
    metaApi
      .restroomOptions()
      .then(setRestrooms)
      .catch((err) => setError(err.message));
  }, []);

  // 切换公厕后重新加载该公厕的巡查记录，供关联选择
  useEffect(() => {
    if (!form.restroom_id) {
      setInspections([]);
      return undefined;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const data = await inspectionApi.list({ restroom_id: form.restroom_id, page_size: 30 });
        let rows = data.items;
        // 从巡查页跳转过来时，目标记录可能不在最近 30 条内，单独补取保证下拉框能正确回显
        const presetId = defaultInspectionId ? Number(defaultInspectionId) : null;
        if (presetId && !rows.some((item) => item.id === presetId)) {
          const extra = await inspectionApi.detail(presetId).catch(() => null);
          if (extra) rows = [extra, ...rows];
        }
        if (!cancelled) setInspections(rows);
      } catch {
        if (!cancelled) setInspections([]);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.restroom_id]);

  const setValue = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.restroom_id) {
      setError('请选择所属公厕');
      return;
    }
    if (!form.title.trim()) {
      setError('请填写问题标题');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await issueApi.create({
        ...form,
        restroom_id: Number(form.restroom_id),
        inspection_id: form.inspection_id ? Number(form.inspection_id) : null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      });
      toast.success('问题已上报，进入待整改状态');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="问题上报"
      onClose={onClose}
      width={780}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="issue-form" className="btn btn-primary" disabled={saving}>
            {saving ? '提交中...' : '提交上报'}
          </button>
        </>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <form id="issue-form" className="form-grid" onSubmit={submit}>
        <Field label="所属公厕 *">
          <select value={form.restroom_id} onChange={setValue('restroom_id')}>
            <option value="">请选择公厕</option>
            {restrooms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} {item.name}（{item.district}）
              </option>
            ))}
          </select>
        </Field>
        <Field label="关联巡查记录" hint="可不选，直接上报">
          <select value={form.inspection_id} onChange={setValue('inspection_id')}>
            <option value="">不关联</option>
            {inspections.map((item) => (
              <option key={item.id} value={item.id}>
                {new Date(item.inspect_time).toLocaleString('zh-CN')} · {item.inspector} · {item.score} 分
              </option>
            ))}
          </select>
        </Field>
        <Field label="问题标题 *" full>
          <input value={form.title} onChange={setValue('title')} placeholder="如：地面污渍未及时清理" />
        </Field>
        <Field label="问题分类">
          <select value={form.category} onChange={setValue('category')}>
            {(dictionaries?.issue_category || []).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="严重程度">
          <select value={form.severity} onChange={setValue('severity')}>
            {(dictionaries?.issue_severity || []).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="上报人">
          <input value={form.reporter} onChange={setValue('reporter')} placeholder="巡查员 / 群众" />
        </Field>
        <Field label="整改责任人">
          <input value={form.assignee} onChange={setValue('assignee')} placeholder="保洁班组 / 责任人" />
        </Field>
        <Field label="整改期限">
          <input type="datetime-local" value={form.deadline} onChange={setValue('deadline')} />
        </Field>
        <Field label="问题描述" full>
          <textarea rows="3" value={form.description} onChange={setValue('description')} />
        </Field>
        <Field label="上报说明" full>
          <textarea
            rows="2"
            value={form.initial_remark}
            onChange={setValue('initial_remark')}
            placeholder="将记录在整改轨迹的首条节点"
          />
        </Field>
      </form>
    </Modal>
  );
}
