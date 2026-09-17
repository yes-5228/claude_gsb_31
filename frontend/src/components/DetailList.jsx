export default function DetailList({ items }) {
  return (
    <div className="detail-list">
      {items.map((item) => (
        <div className="detail-item" key={item.label}>
          <div className="label">{item.label}</div>
          <div className="value">{item.value ?? '-'}</div>
        </div>
      ))}
    </div>
  );
}
