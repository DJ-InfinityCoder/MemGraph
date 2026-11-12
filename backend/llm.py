"""Optional Gemini generation. Offline evaluation does not require the SDK."""
import os

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "")


def chat(prompt, system="", model=None, api_key=None, timeout=30):
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    model = model or os.getenv("GEMINI_MODEL", "")
    if not key or not model:
        raise ValueError("Set GEMINI_API_KEY and GEMINI_MODEL for live generation")
    from google import genai
    from google.genai import types
    with genai.Client(api_key=key, http_options=types.HttpOptions(timeout=int(timeout * 1000))) as client:
        response = client.models.generate_content(
            model=model, contents=prompt,
            config=types.GenerateContentConfig(system_instruction=system) if system else None,
        )
        return response.text or ""
