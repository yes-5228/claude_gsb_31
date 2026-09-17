import { metaApi } from '../api/meta.js';
import { useAsync } from './useAsync.js';

let cache = null;

/** 字典只需拉取一次，模块级缓存避免重复请求。 */
export function useDictionaries() {
  const { data, loading, error } = useAsync(async () => {
    if (cache) return cache;
    cache = await metaApi.dictionaries();
    return cache;
  }, []);

  return {
    dictionaries: data ?? cache,
    loading: loading && !cache,
    error,
  };
}

export function clearDictionaryCache() {
  cache = null;
}
