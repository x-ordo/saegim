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
  beforeLabel = '수선 전',
  afterLabel = '수선 후',
}: BeforeAfterSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
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

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
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
          opacity: isDragging ? 0 : 0.8,
          transition: 'opacity 0.2s',
        }}
      >
        좌우로 드래그하여 비교
      </div>
    </div>
  );
};
