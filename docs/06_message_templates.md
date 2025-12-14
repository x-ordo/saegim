# 06. 메시지 템플릿 (알림톡/SMS)

## Principle
- 정보성(증빙 완료 안내)만.
- 링크 클릭 유도는 “증빙 확인” 목적에 한정.

## Variables
- {ORDER_NO}
- {CONTEXT_SUMMARY}  # 예: OO장례식장 3호실 / OO웨딩홀
- {PROOF_URL}

## Alimtalk Template (v1.5)
Title: [배송/배치 완료] 증빙 안내
Body:
- {CONTEXT_SUMMARY} 배송/배치가 완료되었습니다.
- 증빙 사진 확인: {PROOF_URL}
- 주문번호: {ORDER_NO}

## SMS Fallback
- 동일 문구, 링크 포함(짧은 URL 권장)
