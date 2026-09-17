import { useEffect, useMemo, useState } from 'react';

import { inspectionApi } from '../../api/inspections.js';
import { metaApi } from '../../api/meta.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import { GradeTag, StatusTag } from '../../components/Tags.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useDictionaries } from '../../hooks/useDictionaries.js';
import { calcScore, gradeOf, resultOf } from '../../utils/scoring.js';
import { toDateTimeInput } from '../../utils/format.js';

export default function InspectionFormModal({ defaultRestroomId, onClose, onSaved }) {
  const { dictionaries } = useDictionaries();
  const toast = useToast();
  const [options, setOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    restroom_id: defaultRestroomId ? Number(defaultRestroomId) : '',
    inspector: '',
    shift: '早班',
    inspect_time: toDateTimeInput(),
    remark: '',
  });
  const [items, setItems] = useState([]);

  useEffect(() => {
    metaApi
      .restroomOptions()
      .then(setOptions)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const template = dictionaries?.inspection_check_items || [];
    setItems(template.map((name) => ({ name, score: 9, remark: '' })));
  }, [dictionaries]);

  const score = useMemo(() => calcScore(items), [items]);
  const grade = gradeOf(score);
  const result = resultOf(items, score);

  const setItemScore = (index, value) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, score: Number(value) } : item)),
    );
  };

  const setItemRemark = (index, value) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, remark: value } : item)));
  };

  const fillAll = (value) => setItems((prev) => prev.map((item) => ({ ...item, score: value })));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.restroom_id) {
      setError('请选择被巡查的公厕');
      return;
    }
    if (!form.inspector.trim()) {
      setError('请填写巡查人');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await inspectionApi.create({
        ...form,
        restroom_id: Number(form.restroom_id),
        inspect_time: form.inspect_time ? new Date(form.inspect_time).toISOString() : null,
        items,
      });
      toast.success('巡查记录已提交');
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
      title="新增保洁巡查记录"
      onClose={onClose}
      width={880}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="inspection-form" className="btn btn-primary" disabled={saving}>
            {saving ? '提交中…' : '提交巡查'}
          </button>
        </>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <form id="inspection-form" onSubmit={submit} className="form-grid">
        <Field label="被巡查公厕 *">
          <select
            value={form.restroom_id}
            onChange={(event) => setForm((prev) => ({ ...prev, restroom_id: event.target.value }))}
          >
            <option value="">请选择公厕</option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.code} {option.name}（{option.district}）
              </option>
            ))}
          </select>
        </Field>
        <Field label="巡查人 *">
          <input
            value={form.inspector}
            onChange={(event) => setForm((prev) => ({ ...prev, inspector: event.target.value }))}
            placeholder="请输入巡查人姓名"
          />
        </Field>
        <Field label="班次">
          <select
            value={form.shift}
            onChange={(event) => setForm((prev) => ({ ...prev, shift: event.target.value }))}
          >
            {(dictionaries?.shift || ['早班', '中班', '晚班']).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="巡查时间">
          <input
            type="datetime-local"
            value={form.inspect_time}
            onChange={(event) => setForm((prev) => ({ ...prev, inspect_time: event.target.value }))}
          />
        </Field>
      </form>

      <div className="card-title">
        <div className="inline">
          <h3>检查项评分（每项 0-10 分）</h3>
          <span className="tag tag-primary">当前得分 {score.toFixed(1)}</span>
          <GradeTag grade={grade} />
          <StatusTag status={result} />
        </div>
        <div className="inline">
          <button type="button" className="btn btn-sm" onClick={() => fillAll(10)}>
            全部满分
          </button>
          <button type="button" className="btn btn-sm" onClick={() => fillAll(8)}>
            全部良好
          </button>
        </div>
      </div>

      <div className="check-grid">
        {items.map((item, index) => (
          <div className={`check-item${item.score < 6 ? ' is-low' : ''}`} key={item.name}>
            <div className="name">{item.name}</div>
            <div className="score-line">
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={item.score}
                onChange={(event) => setItemScore(index, event.target.value)}
              />
              <strong>{item.score}</strong>
            </div>
            <input
              style={{ marginTop: 6, fontSize: 12.5, padding: '4px 8px' }}
              className="field-input"
              placeholder="备注（可选）"
              value={item.remark || ''}
              onChange={(event) => setItemRemark(index, event.target.value)}
            />
          </div>
        ))}
      </div>

      <Field label="巡查备注" full>
        <textarea
          rows="2"
          value={form.remark}
          onChange={(event) => setForm((prev) => ({ ...prev, remark: event.target.value }))}
          placeholder="整体情况说明，发现问题可在此描述"
        />
      </Field>
    </Modal>
  );
}
