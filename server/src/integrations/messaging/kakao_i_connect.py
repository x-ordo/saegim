from __future__ import annotations

from typing import Optional

import httpx

from .base import MessagingProvider
from .errors import ConfigMissingError, ProviderHTTPError, ProviderRejectedError
from .types import SendResult


class KakaoIConnectProvider(MessagingProvider):
    """Kakao i Connect Message API provider for AlimTalk.

    API (example):
      POST {base_url}/v2/send/kakao
      Authorization: Bearer {access_token}

    Body keys used:
      message_type: "AT"
      sender_key, template_code, phone_number, sender_no, message, fall_back_yn, cid
    """

    name = "kakao_i_connect"

    def __init__(self, base_url: Optional[str], access_token: Optional[str], *, timeout_s: float = 10.0):
        if not base_url or not access_token:
            raise ConfigMissingError("Kakao i Connect config missing", details="KAKAOI_BASE_URL or KAKAOI_ACCESS_TOKEN")
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.timeout_s = timeout_s

    async def send_alimtalk(
        self,
        *,
        phone: str,
        message: str,
        sender_key: str,
        template_code: str,
        sender_no: Optional[str] = None,
        cid: Optional[str] = None,
        fall_back_yn: bool = False,
    ) -> SendResult:
        if not sender_key or not template_code:
            raise ConfigMissingError("AlimTalk template config missing", details="KAKAO_SENDER_KEY or KAKAO_TEMPLATE_PROOF_DONE")

        url = f"{self.base_url}/v2/send/kakao"
        payload = {
            "message_type": "AT",
            "sender_key": sender_key,
            "template_code": template_code,
            "phone_number": phone,
            "message": message,
            "fall_back_yn": bool(fall_back_yn),
        }
        if sender_no:
            payload["sender_no"] = sender_no
        if cid:
            payload["cid"] = cid

        headers = {
            "authorization": f"Bearer {self.access_token}",
            "accept": "*/*",
            "content-type": "application/json",
        }

        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            r = await client.post(url, headers=headers, json=payload)

        if r.status_code >= 400:
            raise ProviderHTTPError(r.status_code, "Kakao i Connect HTTP error", details=r.text)

        data = r.json() if "application/json" in r.headers.get("content-type", "") else {"raw": r.text}

        # Best-effort success detection: many providers return {result_code, result_message, ...}
        # We'll treat presence of 'error' or non-success result as rejection.
        if isinstance(data, dict) and any(k in data for k in ("error", "errors")):
            raise ProviderRejectedError("PROVIDER_REJECTED", "Kakao provider rejected request", details=str(data))

        request_id = None
        if isinstance(data, dict):
            request_id = data.get("request_id") or data.get("requestId") or data.get("cid")

        return SendResult(request_id=request_id, raw=data)

    async def send_sms(self, *, phone: str, content: str, from_no: Optional[str] = None) -> SendResult:
        # Kakao i Connect may support SMS, but we don't implement here.
        raise ProviderRejectedError("SMS_NOT_SUPPORTED", "SMS is not supported by KakaoIConnectProvider")
