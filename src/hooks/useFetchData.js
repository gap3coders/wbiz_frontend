import { useState, useCallback, useEffect, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

/**
 * useFetchData — Reusable data-fetching hook.
 *
 * Eliminates the repeated fetch/loading/refreshing boilerplate
 * found in every page component.
 *
 * Usage:
 *   const { data, loading, refreshing, refetch } = useFetchData('/campaigns', {
 *     params: { page: 1, limit: 20 },
 *     transform: (res) => res.data.campaigns,
 *     errorMessage: 'Failed to load campaigns',
 *     pollInterval: 5000,  // optional: auto-refresh every 5s
 *   });
 *
 * @param {string} url            API endpoint path
 * @param {object} options
 * @param {object} options.params  Query parameters
 * @param {function} options.transform  Transform response data (default: res.data.data || res.data)
 * @param {string} options.errorMessage  Toast error message on failure
 * @param {boolean} options.immediate  Fetch immediately on mount (default: true)
 * @param {number} options.pollInterval  Auto-refresh interval in ms (0 = disabled)
 * @param {boolean} options.enabled  Whether to fetch (default: true)
 */
export default function useFetchData(url, options = {}) {
  const {
    params,
    transform,
    errorMessage = 'Failed to load data',
    immediate = true,
    pollInterval = 0,
    enabled = true,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async (silent = false) => {
    if (!enabled) return;

    const id = ++requestIdRef.current;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const { data: response } = await api.get(url, { params });
      // Stale request guard
      if (id !== requestIdRef.current) return;

      const result = transform ? transform(response) : (response?.data || response);
      setData(result);
    } catch (err) {
      if (id !== requestIdRef.current) return;
      setError(err);
      if (!silent) toast.error(errorMessage);
    } finally {
      if (id === requestIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [url, JSON.stringify(params), enabled, errorMessage, transform]);

  // Initial fetch
  useEffect(() => {
    if (immediate && enabled) fetchData();
  }, [fetchData, immediate, enabled]);

  // Polling
  useEffect(() => {
    if (!pollInterval || !enabled) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') fetchData(true);
    }, pollInterval);
    return () => clearInterval(timer);
  }, [fetchData, pollInterval, enabled]);

  return {
    data,
    loading,
    refreshing,
    error,
    refetch: fetchData,
    setData,
  };
}
