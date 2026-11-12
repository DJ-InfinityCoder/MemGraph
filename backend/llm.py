"""Unified LLM client: gemini | openai | anthropic | mock. Uses plain REST (httpx)."""
import os
DEFAULTS = {"gemini": "gemini-3.8-flash", "openai": "gpt-4o-mini", "anthropic": "claude-haiku-4-5", "mock": "mock"}
ENV_KEYS = {"gemini": "GEMINI_API_KEY", "openai": "OPENAI_API_KEY", "anthropic": "ANTHROPIC_API_KEY"}

def chat(prompt, system="", provider="mock", model=None, api_key=None, timeout=60):
    provider = (provider or "mock").lower()
    if provider == "mock":
        return ""  # callers fall back to rule-based logic
    import httpx
    model = model or DEFAULTS[provider]
    key = api_key or os.getenv(ENV_KEYS[provider], "")
    if not key:
        raise ValueError(f"No API key for {provider}. Set {ENV_KEYS[provider]} in .env or paste it in the UI.")
    if provider == "gemini":
        r = httpx.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": key}, timeout=timeout,
            json={"systemInstruction": {"parts": [{"text": system}]},
                  "contents": [{"role": "user", "parts": [{"text": prompt}]}]})
        r.raise_for_status()
        return r.json()["candidates"][0]["content"]["parts"][0]["text"]
    if provider == "openai":
        r = httpx.post("https://api.openai.com/v1/chat/completions", timeout=timeout,
            headers={"Authorization": f"Bearer {key}"},
            json={"model": model, "messages": [{"role": "system", "content": system},
                                               {"role": "user", "content": prompt}]})
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    if provider == "anthropic":
        r = httpx.post("https://api.anthropic.com/v1/messages", timeout=timeout,
            headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
            json={"model": model, "max_tokens": 1000, "system": system,
                  "messages": [{"role": "user", "content": prompt}]})
        r.raise_for_status()
        return r.json()["content"][0]["text"]
    raise ValueError(f"Unknown provider {provider}")
