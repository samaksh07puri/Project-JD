"""Unified LLM client supporting Gemini, OpenAI and Groq over HTTP.

Direct REST calls keep the dependency footprint small and make the provider
swappable through a single environment variable.
"""
from __future__ import annotations

import json
import re
from collections.abc import AsyncIterator
from typing import Any

import httpx

from ..config import Settings, get_settings

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models"


class LLMError(Exception):
    """Raised for any provider/network/parsing failure, with a user-safe message."""


def _strip_code_fences(text: str) -> str:
    text = text.strip()
    fence = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    if fence:
        return fence.group(1).strip()
    return text


def parse_json_response(raw: str) -> dict[str, Any]:
    """Best-effort parse of a model response into a JSON object."""
    cleaned = _strip_code_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Attempt to recover the first {...} block from a chatty response.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass
    raise LLMError("The language model returned a response we could not parse.")


class LLMClient:
    """Provider-agnostic chat client."""

    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.provider = self.settings.llm_provider.lower()
        self.model = self.settings.llm_model
        self.api_key = self.settings.active_api_key()
        if not self.api_key:
            raise LLMError(
                f"No API key configured for provider '{self.provider}'. "
                "Set the matching key in the backend .env file."
            )

    async def generate_json(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.4
    ) -> dict[str, Any]:
        raw = await self._chat(system_prompt, user_prompt, temperature, json_mode=True)
        return parse_json_response(raw)

    async def generate_text(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.6
    ) -> str:
        return await self._chat(system_prompt, user_prompt, temperature, json_mode=False)

    async def stream_text(
        self, system_prompt: str, user_prompt: str, temperature: float = 0.6
    ) -> AsyncIterator[str]:
        if self.provider == "gemini":
            async for chunk in self._stream_gemini(system_prompt, user_prompt, temperature):
                yield chunk
        else:
            async for chunk in self._stream_openai_style(system_prompt, user_prompt, temperature):
                yield chunk

    async def _chat(
        self, system_prompt: str, user_prompt: str, temperature: float, json_mode: bool
    ) -> str:
        if self.provider == "gemini":
            return await self._gemini_chat(system_prompt, user_prompt, temperature, json_mode)
        if self.provider in {"openai", "groq"}:
            return await self._openai_chat(
                system_prompt, user_prompt, temperature, json_mode
            )
        raise LLMError(f"Unknown LLM provider: {self.provider}")

    async def _gemini_chat(
        self, system_prompt: str, user_prompt: str, temperature: float, json_mode: bool
    ) -> str:
        url = f"{GEMINI_ENDPOINT}/{self.model}:generateContent"
        payload: dict[str, Any] = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": temperature},
        }
        if json_mode:
            payload["generationConfig"]["responseMimeType"] = "application/json"

        data = await self._post(url, params={"key": self.api_key}, json=payload)
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMError("Unexpected response format from Gemini.") from exc

    async def _openai_chat(
        self, system_prompt: str, user_prompt: str, temperature: float, json_mode: bool
    ) -> str:
        url = f"{self._base_url()}/chat/completions"
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        data = await self._post(url, json=payload, headers=self._auth_headers())
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise LLMError("Unexpected response format from the provider.") from exc

    async def _stream_gemini(
        self, system_prompt: str, user_prompt: str, temperature: float
    ) -> AsyncIterator[str]:
        url = f"{GEMINI_ENDPOINT}/{self.model}:streamGenerateContent"
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
            "generationConfig": {"temperature": temperature},
        }
        async with httpx.AsyncClient(timeout=self.settings.request_timeout) as client:
            async with client.stream(
                "POST", url, params={"key": self.api_key, "alt": "sse"}, json=payload
            ) as response:
                if response.status_code >= 400:
                    await response.aread()
                    self._raise_for_status(response.status_code, response.text)
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    body = line[5:].strip()
                    if not body:
                        continue
                    try:
                        event = json.loads(body)
                        text = event["candidates"][0]["content"]["parts"][0]["text"]
                    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
                        continue
                    yield text

    async def _stream_openai_style(
        self, system_prompt: str, user_prompt: str, temperature: float
    ) -> AsyncIterator[str]:
        url = f"{self._base_url()}/chat/completions"
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": temperature,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=self.settings.request_timeout) as client:
            async with client.stream(
                "POST", url, json=payload, headers=self._auth_headers()
            ) as response:
                if response.status_code >= 400:
                    await response.aread()
                    self._raise_for_status(response.status_code, response.text)
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    body = line[5:].strip()
                    if not body or body == "[DONE]":
                        continue
                    try:
                        event = json.loads(body)
                        delta = event["choices"][0]["delta"].get("content")
                    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
                        continue
                    if delta:
                        yield delta

    def _base_url(self) -> str:
        if self.provider == "groq":
            return "https://api.groq.com/openai/v1"
        return self.settings.openai_base_url.rstrip("/")

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.api_key}"}

    async def _post(
        self,
        url: str,
        *,
        json: dict[str, Any],
        params: dict[str, str] | None = None,
        headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.settings.request_timeout) as client:
                response = await client.post(url, json=json, params=params, headers=headers)
        except httpx.TimeoutException as exc:
            raise LLMError(
                "The language model took too long to respond. Please try again."
            ) from exc
        except httpx.HTTPError as exc:
            raise LLMError(f"Could not reach the language model provider: {exc}") from exc

        if response.status_code >= 400:
            self._raise_for_status(response.status_code, response.text)
        try:
            return response.json()
        except json.JSONDecodeError as exc:
            raise LLMError("The provider returned a malformed response.") from exc

    @staticmethod
    def _raise_for_status(status: int, raw_body: str) -> None:
        detail = raw_body[:300]
        if status in (401, 403):
            message = "The LLM API key was rejected. Check your backend .env configuration."
        elif status == 429:
            message = "The LLM provider rate limit was reached. Please wait and try again."
        elif status >= 500:
            message = "The LLM provider is currently unavailable. Please try again shortly."
        else:
            message = f"The LLM provider returned an error (HTTP {status})."
        raise LLMError(f"{message} Details: {detail}")
