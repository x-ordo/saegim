from __future__ import annotations

import base64
import hashlib
import hmac
import time
from typing import Optional

import httpx

from .base import MessagingProvider
from .errors import ConfigMissingError, ProviderHTTPError, ProviderRejectedError
from .types import SendResult


def _sens_signature(secret_key: str, method: str, url_path: str, timestamp_ms: str, access_key: str) -> str:
    """Create x-ncp-apigw-signature-v2 for NAVER Cloud SENS."""
    message = f"{method} {url_path}\n{timestamp_ms}\n{access_key}"
    signing_key = secret_key.encode("utf-8")
    signature = hmac.new(signing_key, message.encode("utf-8"), digestmod=hashlib.sha256).digest()
    return base64.b64encode(signature).decode("utf-8")


class NaverSensSmsProvider(MessagingProvider):
    """NAVER Cloud SENS SMS provider."""

    name = "sens_sms"

    def __init__(
        self,
        *,
        base_url: str,
        access_key: Optional[str],
        secret_key: Optional[str],
        service_id: Optional[str],
        from_no: Optional[str],
        timeout_s: float = 10.0,
        country_code: str = "82",
        content_type: str = "COMM",
    ):
        if not access_key or not secret_key or not service_id or not from_no:
            raise ConfigMissingError(
                "SENS SMS config missing",
                details="SENS_ACCESS_KEY / SENS_SECRET_KEY / SENS_SMS_SERVICE_ID / SENS_SMS_FROM",
            )
        self.base_url = (base_url or "").rstrip("/")
        self.access_key = access_key
        self.secret_key = secret_key
        self.service_id = service_id
        self.from_no = from_no
        self.timeout_s = timeout_s
        self.country_code = country_code
        self.content_type = content_type

    async def send_sms(self, *, phone: str, content: str, from_no: Optional[str] = None) -> SendResult:
        url_path = f"/sms/v2/services/{self.service_id}/messages"
        url = f"{self.base_url}{url_path}"

        timestamp_ms = str(int(time.time() * 1000))
        signature = _sens_signature(self.secret_key, "POST", url_path, timestamp_ms, self.access_key)

        headers = {
            "Content-Type": "application/json; charset=utf-8",
            "x-ncp-apigw-timestamp": timestamp_ms,
            "x-ncp-iam-access-key": self.access_key,
            "x-ncp-apigw-signature-v2": signature,
        }

        payload = {
            "type": "sms",
            "contentType": self.content_type,
            "countryCode": self.country_code,
            "from": (from_no or self.from_no),
            "content": content,
            "messages": [{"to": phone}],
        }

        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            r = await client.post(url, headers=headers, json=payload)

        if r.status_code >= 400:
            raise ProviderHTTPError(r.status_code, "SENS SMS HTTP error", details=r.text)

        data = r.json() if "application/json" in r.headers.get("content-type", "") else {"raw": r.text}

        # SENS returns statusCode/statusName. Best-effort.
        if isinstance(data, dict) and str(data.get("statusCode", "")).startswith(("4", "5")):
            raise ProviderRejectedError("PROVIDER_REJECTED", "SENS rejected request", details=str(data))

        request_id = data.get("requestId") if isinstance(data, dict) else None
        return SendResult(request_id=request_id, raw=data)

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
        raise ProviderRejectedError("ALIMTALK_NOT_SUPPORTED", "AlimTalk is not supported by NaverSensSmsProvider")
