# 01. 제품 개요 (Product Overview)

## One-liner
QR 스캔 → 사진 업로드 → 자동 메시지 발송 → 로그인 없이 링크 확인(화이트라벨).

## Target
- Primary: 화환/꽃배달 업체(온라인몰/콜센터/도매 네트워크)
- Expansion: 결혼식/개업식/행사/납품 등 “증빙이 필요한 배송”

## Core Entities
- Order: 주문(컨텍스트 포함)
- Token(QR): 공개 접근 토큰
- Proof: 사진 증빙
- Notification: 알림톡/SMS 발송 기록

## v1 Constraints
- Web-first (PWA optional)
- Single photo proof
- Messaging: template-based + SMS fallback
- No billing/dispatching/AI in v1
