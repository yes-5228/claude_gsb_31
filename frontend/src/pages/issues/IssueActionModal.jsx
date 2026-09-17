import { useState } from 'react';

import Field from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import { StatusTag } from '../../components/Tags.jsx';

const PLACEHOLDER = {
  整改中: '填写整改安排，如：已安排保洁班组现场清洗',
  待验收: '填写整改结果，如：已完成清洁并请复查',
  已完成: '填写验收意见，如：现场复核合格',
  已关闭: '填写关闭原因，如：问题已闭环归档',
};

export default function IssueActionModal({ option, issue, onClose, onSubmit, saving }) {
  const [operator, setOperator] = useState(issue.assignee || '');
  const [remark, setRemark] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!operator.trim()) return;
    onSubmit({ to_status: option.status, operator: operator.trim(), remark: remark || null });
  };

  return (
    <Modal
      title={`整改处理 - ${option.action}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="issue-action" className="btn btn-primary" disabled={saving}>
            {saving ? '提交中...' : '确认提交'}
          </button>
        </>
      }
    >
      <div className="alert alert-info">
        当前状态 <StatusTag status={issue.status} /> 变更为 <StatusTag status={option.status} />
      </div>
      <form id="issue-action" className="form-grid" onSubmit={submit}>
        <Field label="操作人 *">
          <input
            value={operator}
            onChange={(event) => setOperator(event.target.value)}
            placeholder="如：保洁班组张伟"
          />
        </Field>
        <Field label="处理说明" full>
          <textarea
            rows="3"
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            placeholder={PLACEHOLDER[option.status] || '填写本次处理说明'}
          />
        </Field>
      </form>
    </Modal>
  );
}
