import { cn } from '@/lib/utils';

export type UploadProgressStatus = 'preparing' | 'uploading' | 'processing' | 'retrying';

interface UploadProgressProps {
  percent: number;
  status: UploadProgressStatus;
  retryAttempt?: number;
  maxRetries?: number;
  className?: string;
}

const STATUS_LABELS: Record<UploadProgressStatus, string> = {
  preparing: '준비 중...',
  uploading: '업로드 중...',
  processing: '처리 중...',
  retrying: '재시도 중...',
};

export const UploadProgress = ({
  percent,
  status,
  retryAttempt,
  maxRetries = 3,
  className,
}: UploadProgressProps) => {
  const label =
    status === 'retrying' && retryAttempt
      ? `재시도 중... (${retryAttempt}/${maxRetries})`
      : STATUS_LABELS[status];

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            status === 'retrying' ? 'bg-amber-500' : 'bg-primary'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
