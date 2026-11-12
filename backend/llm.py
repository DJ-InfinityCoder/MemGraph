"""Gemini client for Gemini 3.8 Flash using REST (httpx)."""
import os

DEFAULT_MODEL = "gemini-3.8-flash"

def chat(prompt, system="", model=DEFAULT_MODEL, api_key=None, timeout=60):
    """Execute chat completion with Gemini 3.8 Flash."""
    import httpx
    model = model or DEFAULT_MODEL
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("GEMINI_API_KEY is not set. Please add it to your .env file.")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}]
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}

    r = httpx.post(url, params={"key": key}, timeout=timeout, json=payload)
    r.raise_for_status()
    data = r.json()
    candidates = data.get("candidates", [])
    if candidates and "content" in candidates[0]:
        parts = candidates[0]["content"].get("parts", [])
        if parts:
            # Filter out thinking process parts to get only final model response
            texts = [p.get("text", "") for p in parts if "text" in p and not p.get("thought", False)]
            if texts:
                return "".join(texts)
            return parts[-1].get("text", "")
    return ""
