export default function BarList({ items, tone = 'primary', emptyText = '暂无数据' }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  if (!items.length) return <div className="empty-block">{emptyText}</div>;

  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.name}>
          <span title={item.name}>{item.name}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${(item.value / max) * 100}%`,
                background: tone === 'primary' ? undefined : item.color,
              }}
            />
          </div>
          <span className="bar-value">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
