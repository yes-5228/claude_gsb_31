import { useState } from 'react';

import { restroomApi } from '../../api/restrooms.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import { useDictionaries } from '../../hooks/useDictionaries.js';
import { useToast } from '../../components/Toast.jsx';

const EMPTY = {
  name: '',
  district: '',
  address: '',
  grade: '二类',
  status: '正常开放',
  manager: '',
  manager_phone: '',
  open_hours: '06:00-22:00',
  stall_count: 0,
  basin_count: 0,
  has_accessible: true,
  remark: '',
};

export default function RestroomFormModal({ restroom, onClose, onSaved }) {
  const { dictionaries } = useDictionaries();
  const toast = useToast();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...(restroom ?? {}) }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setValue = (key) => (event) => {
    const target = event.target;
    const value =
      target.type === 'checkbox'
        ? target.checked
        : target.type === 'number'
          ? Number(target.value)
          : target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.district.trim()) {
      setError('公厕名称与所属区域为必填项');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = { ...form };
    delete payload.id;
    delete payload.code;
    delete payload.created_at;
    delete payload.updated_at;
    try {
      if (restroom?.id) {
        await restroomApi.update(restroom.id, payload);
        toast.success('公厕信息已更新');
      } else {
        await restroomApi.create({ ...payload, code: form.code || null });
        toast.success('公厕已新增');
      }
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
      title={restroom?.id ? `编辑公厕 - ${restroom.code}` : '新增公厕'}
      onClose={onClose}
      width={820}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="restroom-form" className="btn btn-primary" disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <form id="restroom-form" className="form-grid" onSubmit={submit}>
        <Field label="公厕名称 *">
          <input value={form.name} onChange={setValue('name')} placeholder="如：人民广场公共厕所" />
        </Field>
        <Field label="所属区域 *">
          <input value={form.district} onChange={setValue('district')} placeholder="如：城东区" />
        </Field>
        <Field label="公厕编号" hint="留空由系统自动生成">
          <input
            value={restroom?.id ? restroom.code : form.code || ''}
            onChange={setValue('code')}
            disabled={Boolean(restroom?.id)}
            placeholder="自动生成"
          />
        </Field>
        <Field label="公厕等级">
          <select value={form.grade} onChange={setValue('grade')}>
            {(dictionaries?.restroom_grade || ['一类', '二类', '三类']).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="开放状态">
          <select value={form.status} onChange={setValue('status')}>
            {(dictionaries?.restroom_status || ['正常开放', '维修中', '暂停使用']).map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </Field>
        <Field label="开放时间">
          <input value={form.open_hours} onChange={setValue('open_hours')} placeholder="06:00-22:00" />
        </Field>
        <Field label="保洁责任人">
          <input value={form.manager} onChange={setValue('manager')} />
        </Field>
        <Field label="联系电话">
          <input value={form.manager_phone} onChange={setValue('manager_phone')} />
        </Field>
        <Field label="蹲位数量">
          <input type="number" min="0" value={form.stall_count} onChange={setValue('stall_count')} />
        </Field>
        <Field label="洗手盆数量">
          <input type="number" min="0" value={form.basin_count} onChange={setValue('basin_count')} />
        </Field>
        <Field label="无障碍设施" full>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.has_accessible}
              onChange={setValue('has_accessible')}
            />
            已配置无障碍厕位
          </label>
        </Field>
        <Field label="详细地址" full>
          <input value={form.address} onChange={setValue('address')} placeholder="路名 + 门牌或明显参照物" />
        </Field>
        <Field label="备注" full>
          <textarea rows="2" value={form.remark || ''} onChange={setValue('remark')} />
        </Field>
      </form>
    </Modal>
  );
}
