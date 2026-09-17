import { useState } from 'react';

import { issueApi } from '../../api/issues.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import { useToast } from '../../components/Toast.jsx';
import { useDictionaries } from '../../hooks/useDictionaries.js';
import { toDateTimeInput } from '../../utils/format.js';

export default function IssueEditModal({ issue, onClose, onSaved }) {
  const { dictionaries } = useDictionaries();
  const toast = useToast();
  const [form, setForm] = useState({
    title: issue.title,
    description: issue.description || '',
    category: issue.category,
    severity: issue.severity,
    assignee: issue.assignee || '',
    deadline: issue.deadline ? toDateTimeInput(issue.deadline) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const setValue = (key) => (event) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await issueApi.update(issue.id, {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      });
      toast.success('问题信息已更新');
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
      title={`编辑问题 - ${issue.code}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="issue-edit" className="btn btn-primary" disabled={saving}>
            保存
          </button>
        </>
      }
    >
      {error ? <div className="alert alert-error">{error}</div> : null}
      <form id="issue-edit" className="form-grid" onSubmit={submit}>
        <Field label="问题标题" full>
          <input value={form.title} onChange={setValue('title')} />
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
        <Field label="整改责任人">
          <input value={form.assignee} onChange={setValue('assignee')} />
        </Field>
        <Field label="整改期限">
          <input type="datetime-local" value={form.deadline} onChange={setValue('deadline')} />
        </Field>
        <Field label="问题描述" full>
          <textarea rows="3" value={form.description} onChange={setValue('description')} />
        </Field>
      </form>
    </Modal>
  );
}
