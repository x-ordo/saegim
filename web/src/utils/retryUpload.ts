/**
 * Retry utility with exponential backoff
 * 지수 백오프를 사용한 자동 재시도 유틸리티
 */

export interface RetryConfig {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute a function with retry logic using exponential backoff
 * @param fn - The async function to execute
 * @param config - Retry configuration
 * @param onRetry - Callback when a retry is attempted
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = {},
  onRetry?: (attempt: number, delay: number, error: Error) => void
): Promise<T> => {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Rate limiting은 재시도하지 않음 (서버 정책 존중)
      if (lastError.message === 'RATE_LIMITED') {
        throw lastError;
      }

      // 마지막 시도가 아니면 재시도
      if (attempt < cfg.maxRetries) {
        const delay = Math.min(
          cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, attempt),
          cfg.maxDelayMs
        );

        onRetry?.(attempt + 1, delay, lastError);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

/**
 * Check if an error is retryable
 */
export const isRetryableError = (error: Error): boolean => {
  const message = error.message.toLowerCase();

  // 재시도 불가능한 에러
  if (message.includes('rate_limited')) return false;
  if (message.includes('already uploaded')) return false;
  if (message.includes('token_invalid')) return false;
  if (message.includes('token_expired')) return false;

  // 네트워크 에러는 재시도 가능
  if (message.includes('network')) return true;
  if (message.includes('timeout')) return true;
  if (message.includes('failed to fetch')) return true;

  return true;
};
