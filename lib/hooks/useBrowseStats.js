import useSWR from 'swr';

/**
 * Fetcher function for SWR
 */
const fetcher = (url) => fetch(url).then((res) => res.json());

/**
 * SWR configuration for browse stats
 * - Cache for 1 hour (3600000ms)
 * - Don't refetch on window focus
 * - Don't refetch on reconnect
 * - Deduplicate requests within 1 hour
 */
const SWR_CONFIG = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 3600000, // 1 hour
  refreshInterval: 0, // Don't auto-refresh
};

/**
 * useBrowseStats - Shared hook for fetching browse statistics
 *
 * Uses SWR for intelligent caching:
 * - Multiple components calling this hook = 1 API request
 * - Data cached for 1 hour across page navigations
 * - Can accept fallbackData from SSR for instant hydration
 *
 * @param {Object} options - Hook options
 * @param {Object} options.fallbackData - Optional SSR data to use as initial value
 * @returns {Object} { data, isLoading, error }
 */
export function useBrowseStats({ fallbackData = null } = {}) {
  const { data, error, isLoading } = useSWR(
    '/api/jobs/browse-stats',
    fetcher,
    {
      ...SWR_CONFIG,
      fallbackData: fallbackData ? { success: true, data: fallbackData } : undefined,
    }
  );

  return {
    stats: data?.success ? data.data : null,
    isLoading: !fallbackData && isLoading,
    error: error || (data && !data.success ? new Error('Failed to fetch stats') : null),
  };
}

export default useBrowseStats;
