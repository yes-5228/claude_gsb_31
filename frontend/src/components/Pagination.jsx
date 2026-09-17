export default function Pagination({ meta, onPageChange }) {
  const { total, page, pages, page_size: pageSize } = meta;
  return (
    <div className="pagination">
      <span>
        共 {total} 条记录，每页 {pageSize} 条
      </span>
      <div className="pages">
        <button
          type="button"
          className="btn btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          上一页
        </button>
        <span>
          第 {page} / {pages || 1} 页
        </span>
        <button
          type="button"
          className="btn btn-sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          下一页
        </button>
      </div>
    </div>
  );
}
