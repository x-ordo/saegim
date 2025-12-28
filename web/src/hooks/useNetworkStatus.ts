import { useEffect, useState, useCallback } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
}

/**
 * Hook to detect network connection status
 * 네트워크 연결 상태 감지 훅
 */
export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  }));

  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as any).connection;

    setStatus({
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      updateNetworkInfo();
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Network Information API (Chrome/Edge only)
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
};

/**
 * Check if network is slow (2G or worse)
 */
export const isSlowNetwork = (status: NetworkStatus): boolean => {
  if (!status.isOnline) return true;
  if (status.effectiveType === 'slow-2g' || status.effectiveType === '2g') return true;
  if (status.rtt && status.rtt > 500) return true;
  return false;
};
