# 화환 배송 알림톡 템플릿

## 사용 가능한 변수

| 변수 | 설명 | 예시 |
|------|------|------|
| `{brand}` | 업체명 | 꽃배달서비스 |
| `{url}` | 확인 링크 | https://sgm.kr/s/ABC123 |
| `{order}` | 주문번호 | 20241228-001 |
| `{context}` | 배송 장소 | OO장례식장 3호실 |
| `{sender}` | 보낸 분 | 홍길동 |
| `{recipient}` | 받는 분 | 김철수 |

---

## 1. 장례식장용 템플릿

### 보낸 사람 (sender)

**기본형**
```
[{brand}] 화환 배송 완료

{sender}님이 보내신 화환이
{context}에 도착했습니다.

배송 확인: {url}
```

**상세형**
```
[{brand}] 배송 완료 안내

보내신 분: {sender}님
배송 장소: {context}
주문번호: {order}

화환이 정상적으로 배송되었습니다.
아래 링크에서 배송 사진을 확인하세요.

확인하기: {url}
```

**간결형**
```
[{brand}]
{context} 화환 배송 완료
확인: {url}
```

### 받는 사람 (recipient)

**기본형**
```
[{brand}] 화환 도착 안내

{sender}님께서 보내신 화환이
{context}에 도착했습니다.

확인하기: {url}
```

**간결형**
```
[{brand}]
{sender}님의 화환이 도착했습니다.
{context}
확인: {url}
```

---

## 2. 축하 행사용 템플릿 (개업, 결혼 등)

### 보낸 사람 (sender)

**개업 축하**
```
[{brand}] 축하 화환 배송 완료

{sender}님이 보내신 축하 화환이
{context}에 도착했습니다.

배송 확인: {url}
```

**결혼 축하**
```
[{brand}] 축하 화환 배송 완료

{recipient}님께 보내신 화환이
{context}에 도착했습니다.

확인하기: {url}
```

### 받는 사람 (recipient)

**개업 축하**
```
[{brand}] 축하 화환 도착

{sender}님께서 축하 화환을 보내셨습니다.
{context}

확인: {url}
```

---

## 3. SMS 폴백 템플릿 (알림톡 실패 시)

SMS는 글자 수 제한이 있으므로 간결하게 작성

### 보낸 사람 (sender)
```
[{brand}] {context} 화환배송완료 {url}
```

### 받는 사람 (recipient)
```
[{brand}] {sender}님 화환도착 {url}
```

---

## 4. 조직별 설정 예시

### Organization 테이블 설정

```sql
UPDATE organizations SET
  msg_alimtalk_template_sender = '[{brand}] 화환 배송 완료

{sender}님이 보내신 화환이
{context}에 도착했습니다.

배송 확인: {url}',

  msg_alimtalk_template_recipient = '[{brand}] 화환 도착 안내

{sender}님께서 보내신 화환이
{context}에 도착했습니다.

확인하기: {url}',

  msg_sms_template_sender = '[{brand}] {context} 화환배송완료 {url}',

  msg_sms_template_recipient = '[{brand}] {sender}님 화환도착 {url}'

WHERE id = {organization_id};
```

---

## 5. 카카오 알림톡 등록 시 주의사항

1. **템플릿 심사**: 카카오 비즈니스 채널에서 템플릿 심사 필요 (1-3일 소요)

2. **변수 형식**: 카카오는 `#{변수명}` 형식 사용
   - 우리 시스템: `{brand}` → 카카오 등록: `#{brand}`

3. **글자 수 제한**:
   - 제목: 최대 50자
   - 본문: 최대 1000자 (변수 포함)

4. **버튼 추가 가능**:
   ```
   버튼 타입: 웹링크
   버튼명: 배송 사진 확인
   URL: {url}
   ```

5. **정보성 vs 광고성**:
   - 배송 알림 = 정보성 (수신 동의 불필요)
   - 광고 포함 시 = 광고성 (별도 수신 동의 필요)

---

## 6. 권장 템플릿 (기본값)

### config.py 설정

```python
# 화환 배송용 기본 템플릿
ALIMTALK_TEMPLATE_SENDER = """[{brand}] 화환 배송 완료

{context}에 화환이 도착했습니다.

확인: {url}"""

ALIMTALK_TEMPLATE_RECIPIENT = """[{brand}] 화환 도착

{sender}님께서 보내신 화환이 도착했습니다.
{context}

확인: {url}"""

SMS_TEMPLATE_SENDER = "[{brand}] 화환배송완료 {url}"
SMS_TEMPLATE_RECIPIENT = "[{brand}] {sender}님 화환도착 {url}"
```

---

## 7. 실제 발송 예시

### 주문 정보
- 업체: 꽃배달서비스
- 보낸 분: 홍길동
- 받는 분: 김철수
- 장소: 서울추모공원 국화실
- 링크: https://sgm.kr/s/X7K9M2

### 보낸 분께 발송되는 메시지
```
[꽃배달서비스] 화환 배송 완료

서울추모공원 국화실에 화환이 도착했습니다.

확인: https://sgm.kr/s/X7K9M2
```

### 받는 분께 발송되는 메시지
```
[꽃배달서비스] 화환 도착

홍길동님께서 보내신 화환이 도착했습니다.
서울추모공원 국화실

확인: https://sgm.kr/s/X7K9M2
```
