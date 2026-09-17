import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const EMPTY_META = { total: 0, page: 1, page_size: 10, pages: 0 };

/**
 * 列表页通用逻辑：维护过滤条件与分页，并在条件变化时自动请求。
 * fetcher 允许每次渲染传入新函数，内部用 ref 保持稳定，避免重复请求。
 */
export function useListQuery(fetcher, defaultFilters = {}, pageSize = 10) {
  const [filters, setFilters] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const params = useMemo(
    () => ({ ...filters, page, page_size: pageSize }),
    [filters, page, pageSize],
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current(params);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateFilter = useCallback((key, value) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setPage(1);
    setFilters(defaultFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    items: data?.items ?? [],
    meta: data?.meta ?? EMPTY_META,
    loading,
    error,
    filters,
    page,
    pageSize,
    setPage,
    updateFilter,
    resetFilters,
    reload,
  };
}
