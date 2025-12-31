import { useCallback, useEffect, useRef, useState } from 'react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterSlider = ({
  beforeUrl,
  afterUrl,
  beforeLabel = '상품',
  afterLabel = '배송 완료',
}: BeforeAfterSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  }, [handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      handleMove(e.clientX);
    }
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isDragging) {
      handleMove(e.touches[0].clientX);
    }
  }, [isDragging, handleMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard navigation handler (WCAG 2.1.1 Keyboard)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 5; // 5% per key press
    const largeStep = 10; // 10% for page up/down

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        setPosition((p) => Math.max(0, p - step));
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        setPosition((p) => Math.min(100, p + step));
        break;
      case 'Home':
        e.preventDefault();
        setPosition(0);
        break;
      case 'End':
        e.preventDefault();
        setPosition(100);
        break;
      case 'PageDown':
        e.preventDefault();
        setPosition((p) => Math.max(0, p - largeStep));
        break;
      case 'PageUp':
        e.preventDefault();
        setPosition((p) => Math.min(100, p + largeStep));
        break;
    }
  }, []);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  // Global mouse events for smooth dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Generate position description for screen readers
  const getPositionDescription = () => {
    if (position <= 10) return `${beforeLabel} 거의 보이지 않음`;
    if (position <= 40) return `${beforeLabel} 일부 표시`;
    if (position <= 60) return `${beforeLabel}과 ${afterLabel} 절반씩 표시`;
    if (position <= 90) return `${afterLabel} 일부 표시`;
    return `${afterLabel} 거의 보이지 않음`;
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label={`${beforeLabel}과 ${afterLabel} 비교 슬라이더`}
      aria-valuenow={Math.round(position)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(position)}% 위치, ${getPositionDescription()}`}
      aria-orientation="horizontal"
      tabIndex={0}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        outline: isFocused ? '2px solid hsl(var(--ring))' : 'none',
        outlineOffset: 2,
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {/* After image (full width, background) */}
      <img
        src={afterUrl}
        alt={afterLabel}
        style={{
          width: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
        draggable={false}
      />

      {/* Before image (clipped) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${position}%`,
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          style={{
            width: containerWidth || '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none',
          }}
          draggable={false}
        />
      </div>

      {/* Slider handle */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${position}%`,
          transform: 'translateX(-50%)',
          width: 4,
          height: '100%',
          background: 'white',
          boxShadow: '0 0 8px rgba(0,0,0,0.3)',
        }}
      >
        {/* Handle circle */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'white',
            boxShadow: isFocused ? '0 0 0 3px hsl(var(--ring))' : '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'box-shadow 0.2s',
          }}
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M6 10L2 10M2 10L5 7M2 10L5 13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 10L18 10M18 10L15 7M18 10L15 13" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {beforeLabel}
      </div>
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '4px 10px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        {afterLabel}
      </div>

      {/* Instruction hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.5)',
          color: 'white',
          padding: '4px 12px',
          borderRadius: 12,
          fontSize: 12,
          opacity: isDragging || isFocused ? 0 : 0.8,
          transition: 'opacity 0.2s',
        }}
        aria-hidden="true"
      >
        드래그 또는 ← → 키로 비교
      </div>
    </div>
  );
};
