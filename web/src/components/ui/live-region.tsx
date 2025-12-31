import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * WCAG 4.1.3: Status Messages
 *
 * Live Region 컴포넌트: 스크린 리더에 동적 콘텐츠 변경을 알립니다.
 *
 * @example
 * // 일반 상태 메시지 (polite)
 * <StatusMessage>업로드가 완료되었습니다.</StatusMessage>
 *
 * @example
 * // 긴급 오류 메시지 (assertive)
 * <AlertMessage>오류가 발생했습니다.</AlertMessage>
 */

interface LiveRegionProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 라이브 리전의 공손함 수준 */
  politeness?: 'polite' | 'assertive' | 'off';
  /** 변경 시 전체 내용을 읽을지 여부 */
  atomic?: boolean;
  /** 관련 변경 사항 포함 여부 */
  relevant?: 'additions' | 'removals' | 'text' | 'all' | 'additions text';
  children: React.ReactNode;
}

/**
 * LiveRegion - 기본 라이브 리전 컴포넌트
 *
 * aria-live를 사용하여 스크린 리더에 동적 변경을 알립니다.
 */
export function LiveRegion({
  politeness = 'polite',
  atomic = true,
  relevant = 'additions text',
  className,
  children,
  ...props
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * StatusMessage - 일반 상태 메시지 (polite)
 *
 * 스크린 리더가 현재 읽는 내용을 마친 후 이 메시지를 읽습니다.
 * 업로드 완료, 검색 결과, 진행률 업데이트 등에 사용합니다.
 */
export function StatusMessage({
  className,
  children,
  ...props
}: Omit<LiveRegionProps, 'politeness'>) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * AlertMessage - 긴급 오류/경고 메시지 (assertive)
 *
 * 스크린 리더가 현재 읽는 내용을 즉시 중단하고 이 메시지를 읽습니다.
 * 폼 오류, 세션 만료, 치명적 오류 등에만 제한적으로 사용합니다.
 *
 * 주의: 남용 시 사용자 경험을 해칩니다.
 */
export function AlertMessage({
  className,
  children,
  ...props
}: Omit<LiveRegionProps, 'politeness'>) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * VisuallyHidden - 시각적으로 숨기지만 스크린 리더는 읽음
 *
 * 시각적 레이아웃에는 영향을 주지 않으면서
 * 보조 기술 사용자에게 추가 정보를 제공합니다.
 */
export function VisuallyHidden({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('sr-only', className)}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * useLiveAnnouncement - 동적 알림을 위한 훅
 *
 * 프로그래밍 방식으로 스크린 리더에 메시지를 알릴 때 사용합니다.
 *
 * @example
 * const announce = useLiveAnnouncement();
 *
 * const handleUploadComplete = () => {
 *   announce('파일 업로드가 완료되었습니다.', 'polite');
 * };
 */
export function useLiveAnnouncement() {
  const [announcement, setAnnouncement] = React.useState<{
    message: string;
    politeness: 'polite' | 'assertive';
  } | null>(null);

  const announce = React.useCallback(
    (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
      // 동일 메시지 재알림을 위해 먼저 비움
      setAnnouncement(null);
      // 다음 렌더 사이클에서 메시지 설정
      requestAnimationFrame(() => {
        setAnnouncement({ message, politeness });
      });
    },
    []
  );

  // 알림 후 자동 정리 (3초 후)
  React.useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  const AnnouncerComponent = React.useMemo(
    () =>
      function Announcer() {
        if (!announcement) return null;
        return (
          <div
            role={announcement.politeness === 'assertive' ? 'alert' : 'status'}
            aria-live={announcement.politeness}
            aria-atomic="true"
            className="sr-only"
          >
            {announcement.message}
          </div>
        );
      },
    [announcement]
  );

  return { announce, AnnouncerComponent };
}
