# Saegim Design Tokens

> 디자인 시스템의 기초가 되는 토큰 정의서

## 개요

Saegim은 **Shadcn UI + Tailwind CSS** 기반의 디자인 시스템을 사용합니다.
모든 디자인 값은 CSS 변수로 정의되어 있어 쉽게 커스터마이징할 수 있습니다.

### 토큰 구조

```
Primitive Tokens (원시 값)
    ↓
Semantic Tokens (의미 기반)
    ↓
Component Tokens (컴포넌트 전용)
```

---

## 1. Color Tokens

### 1.1 Neutral Scale (Warm Gray)

따뜻한 느낌의 회색 계열. 명품 수선 피벗을 고려해 차가운 회색 대신 따뜻한 톤 사용.

| Token | HSL | 용도 |
|-------|-----|------|
| `--neutral-50` | 40 20% 98% | 가장 밝은 배경 |
| `--neutral-100` | 40 15% 96% | 기본 배경 |
| `--neutral-200` | 40 10% 92% | Secondary 배경 |
| `--neutral-300` | 40 8% 85% | Border |
| `--neutral-400` | 40 5% 65% | Placeholder |
| `--neutral-500` | 40 4% 46% | Muted 텍스트 |
| `--neutral-600` | 40 5% 34% | Secondary 텍스트 |
| `--neutral-700` | 40 6% 24% | Primary 텍스트 |
| `--neutral-800` | 40 8% 14% | Heading |
| `--neutral-900` | 40 10% 8% | 기본 텍스트 |
| `--neutral-950` | 40 12% 4% | 가장 어두운 색상 |

### 1.2 Brand Colors

현재: 미니멀 블랙. 향후 명품 브랜드 피벗 시 쉽게 변경 가능.

```css
--brand-50:  40 20% 97%;   /* 가장 밝은 브랜드 색 */
--brand-100: 40 15% 93%;
--brand-200: 40 10% 85%;
--brand-500: 0 0% 25%;
--brand-600: 0 0% 15%;
--brand-700: 0 0% 9%;      /* Primary 버튼 */
--brand-900: 0 0% 4%;      /* 가장 어두운 브랜드 색 */
```

### 1.3 Status Colors

| 상태 | 50 (Background) | 600 (Text/Icon) | 용도 |
|------|-----------------|-----------------|------|
| **Green** | 142 76% 95% | 142 76% 26% | 성공, 완료 |
| **Red** | 0 86% 97% | 0 72% 45% | 에러, 삭제 |
| **Amber** | 48 100% 96% | 32 95% 44% | 경고, 주의 |
| **Blue** | 214 100% 97% | 221 83% 48% | 정보, 링크 |

### 1.4 Semantic Colors (Tailwind 사용)

| Tailwind Class | 용도 | 예시 |
|----------------|------|------|
| `bg-background` | 페이지 배경 | 기본 배경 |
| `text-foreground` | 기본 텍스트 | 본문 |
| `bg-primary` | CTA 버튼 | 저장, 제출 |
| `bg-secondary` | 보조 버튼 | 취소 |
| `bg-destructive` | 삭제 버튼 | 삭제, 제거 |
| `text-muted-foreground` | 힌트 텍스트 | placeholder |
| `bg-success` | 성공 상태 | 완료 뱃지 |
| `bg-warning` | 경고 상태 | 주의 알림 |
| `bg-info` | 정보 상태 | 안내 메시지 |

---

## 2. Typography Tokens

### 2.1 Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Pretendard',
             'Segoe UI', Roboto, sans-serif;
```

한글 최적화를 위해 Pretendard 폰트 우선 적용.

### 2.2 Font Size Scale

| Token | Size | Line Height | Tailwind | 용도 |
|-------|------|-------------|----------|------|
| `--text-xs` | 12px | 1.5 | `text-xs` | 캡션, 뱃지 |
| `--text-sm` | 14px | 1.5 | `text-sm` | 보조 텍스트, 라벨 |
| `--text-base` | 16px | 1.625 | `text-base` | 본문 |
| `--text-lg` | 18px | 1.625 | `text-lg` | 강조 본문 |
| `--text-xl` | 20px | 1.5 | `text-xl` | 소제목 |
| `--text-2xl` | 24px | 1.4 | `text-2xl` | 제목 |
| `--text-3xl` | 30px | 1.3 | `text-3xl` | 페이지 제목 |
| `--text-4xl` | 36px | 1.2 | `text-4xl` | 대제목 |

### 2.3 Font Weight

| Token | Value | Tailwind | 용도 |
|-------|-------|----------|------|
| `--font-normal` | 400 | `font-normal` | 본문 |
| `--font-medium` | 500 | `font-medium` | 강조 |
| `--font-semibold` | 600 | `font-semibold` | 버튼, 라벨 |
| `--font-bold` | 700 | `font-bold` | 제목 |
| `--font-extrabold` | 800 | `font-extrabold` | KPI 숫자 |

---

## 3. Spacing Tokens

4px 그리드 시스템 기반.

| Token | Size | Tailwind | 용도 |
|-------|------|----------|------|
| `--space-1` | 4px | `p-1` | 아이콘 간격 |
| `--space-2` | 8px | `p-2` | 작은 패딩 |
| `--space-3` | 12px | `p-3` | 카드 내부 |
| `--space-4` | 16px | `p-4` | 기본 패딩 |
| `--space-5` | 20px | `p-5` | 섹션 간격 |
| `--space-6` | 24px | `p-6` | 카드 패딩 |
| `--space-8` | 32px | `p-8` | 큰 간격 |
| `--space-10` | 40px | `p-10` | 페이지 패딩 |
| `--space-12` | 48px | `p-12` | 터치 타겟 |
| `--space-16` | 64px | `p-16` | 섹션 구분 |

---

## 4. Border Radius Tokens

| Token | Size | Tailwind | 용도 |
|-------|------|----------|------|
| `--radius-sm` | 8px | `rounded-sm` | 작은 버튼, 뱃지 |
| `--radius` | 12px | `rounded-lg` | 기본 (카드, 버튼) |
| `--radius-lg` | 16px | `rounded-xl` | 큰 카드 |
| `--radius-xl` | 24px | `rounded-2xl` | 모달 |
| `--radius-full` | 9999px | `rounded-full` | 원형 뱃지 |

---

## 5. Shadow Tokens

| Token | Tailwind | 용도 |
|-------|----------|------|
| `--shadow-sm` | `shadow-sm` | 호버 상태 |
| `--shadow` | `shadow` | 카드 기본 |
| `--shadow-md` | `shadow-md` | 드롭다운 |
| `--shadow-lg` | `shadow-lg` | 모달 |

---

## 6. Animation & Transition

### 6.1 Duration

| Token | Value | Tailwind | 용도 |
|-------|-------|----------|------|
| `--duration-fast` | 150ms | `duration-fast` | 호버 |
| `--duration-normal` | 200ms | `duration-normal` | 기본 전환 |
| `--duration-slow` | 300ms | `duration-slow` | 모달, 슬라이드 |

### 6.2 Easing

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);  /* 기본 */
--ease-in: cubic-bezier(0.4, 0, 1, 1);         /* 들어오기 */
--ease-out: cubic-bezier(0, 0, 0.2, 1);        /* 나가기 */
```

### 6.3 Animation Classes

| Tailwind | 용도 |
|----------|------|
| `animate-fade-in` | 페이드 인 |
| `animate-scale-in` | 스케일 인 (모달) |
| `animate-slide-in-top` | 위에서 슬라이드 |
| `animate-slide-in-bottom` | 아래에서 슬라이드 |
| `animate-spin-slow` | 느린 회전 (로딩) |

---

## 7. Z-Index Scale

레이어 충돌 방지를 위한 표준화된 스케일.

| Token | Value | 용도 |
|-------|-------|------|
| `--z-dropdown` | 50 | 드롭다운 메뉴 |
| `--z-sticky` | 100 | 고정 헤더 |
| `--z-modal` | 200 | 모달 배경 |
| `--z-popover` | 300 | 팝오버 |
| `--z-tooltip` | 400 | 툴팁 |
| `--z-toast` | 500 | 토스트 알림 |

---

## 8. Touch Target (모바일 최적화)

모바일 사용성을 위한 최소 터치 영역.

| Token | Size | 용도 |
|-------|------|------|
| `--touch-target` | 48px | 기본 터치 영역 |
| `--touch-target-sm` | 44px | 작은 터치 영역 |

```jsx
// 사용 예시
<Button className="touch-target">카메라 열기</Button>
<button className="min-h-touch min-w-touch">...</button>
```

---

## 9. Component Classes

### 9.1 Status Cards

```jsx
<div className="status-success">성공 메시지</div>
<div className="status-warning">경고 메시지</div>
<div className="status-error">에러 메시지</div>
<div className="status-info">정보 메시지</div>
```

### 9.2 KPI Card

```jsx
<div className="kpi-card">
  <div className="kpi-value">1,234</div>
  <div className="kpi-label">총 주문</div>
</div>
```

### 9.3 Data Table

```jsx
<table className="data-table">
  <thead>
    <tr><th>헤더</th></tr>
  </thead>
  <tbody>
    <tr><td>데이터</td></tr>
  </tbody>
</table>
```

### 9.4 Page Header

```jsx
<div className="page-header">
  <h1 className="page-title">페이지 제목</h1>
  <p className="page-description">페이지 설명</p>
</div>
```

---

## 10. 명품 피벗 가이드

향후 명품 수선 플랫폼으로 피벗 시 변경할 토큰:

### 10.1 Brand Color 변경

```css
/* 현재: 미니멀 블랙 */
--brand-700: 0 0% 9%;

/* 예시: 골드 톤 (명품) */
--brand-700: 40 60% 45%;  /* 따뜻한 골드 */

/* 예시: 네이비 (클래식) */
--brand-700: 220 65% 20%;  /* 깊은 네이비 */
```

### 10.2 Typography 변경

```css
/* 명품 느낌의 세리프 폰트 추가 */
font-family: 'Playfair Display', 'Noto Serif KR', serif;
```

### 10.3 Border Radius 조정

```css
/* 더 샤프한 느낌 */
--radius: 4px;
--radius-lg: 8px;
```

---

## 파일 위치

| 파일 | 역할 |
|------|------|
| `src/styles/globals.css` | CSS 변수 정의, 레거시 지원 |
| `tailwind.config.js` | Tailwind 토큰 확장 |
| `src/components/ui/*` | Shadcn UI 컴포넌트 |

---

## 사용 예시

### Tailwind 클래스

```jsx
// 배경 + 텍스트
<div className="bg-background text-foreground">

// 카드
<div className="bg-card text-card-foreground rounded-lg shadow">

// 버튼
<Button className="bg-primary text-primary-foreground">

// 상태 표시
<Badge className="bg-success text-success-foreground">
```

### CSS 변수 직접 사용

```css
.custom-element {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  border-radius: var(--radius);
  padding: var(--space-4);
  box-shadow: var(--shadow);
  transition: all var(--duration-normal) var(--ease-default);
}
```
