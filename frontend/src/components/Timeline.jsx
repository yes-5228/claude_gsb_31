import { formatDateTime } from '../utils/format.js';
import { StatusTag } from './Tags.jsx';

export default function Timeline({ records }) {
  if (!records?.length) return <div className="empty-block">暂无整改记录</div>;

  return (
    <ol className="timeline">
      {records.map((record) => (
        <li key={record.id}>
          <div className="head">
            <strong>{record.action}</strong>
            {record.to_status ? <StatusTag status={record.to_status} /> : null}
            <span className="time">{formatDateTime(record.created_at)}</span>
            <span className="muted">操作人：{record.operator || '系统'}</span>
          </div>
          {record.remark ? <div className="remark">{record.remark}</div> : null}
        </li>
      ))}
    </ol>
  );
}
