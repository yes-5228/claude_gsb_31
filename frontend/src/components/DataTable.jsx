export default function DataTable({ columns, rows, loading, error, emptyText = '暂无数据', rowKey }) {
  if (loading) {
    return <div className="loading-block">数据加载中…</div>;
  }
  if (error) {
    return <div className="alert alert-error">{error.message || '数据加载失败'}</div>;
  }
  if (!rows.length) {
    return <div className="empty-block">{emptyText}</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={column.width ? { width: column.width } : undefined}>
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey ? rowKey(row) : (row.id ?? index)}>
              {columns.map((column) => (
                <td key={column.key} className={column.wrap ? 'wrap' : undefined}>
                  {column.render ? column.render(row) : row[column.key] ?? '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
