"""Gemini 3.8 Flash client using the official google-genai SDK."""
import os
from google import genai

DEFAULT_MODEL = "gemini-3.8-flash"

def chat(prompt, system="", model=DEFAULT_MODEL, api_key=None, timeout=60):
    """Execute chat completion with Gemini 3.8 Flash via google-genai SDK."""
    key = api_key or os.getenv("GEMINI_API_KEY", "")
    if not key:
        raise ValueError("GEMINI_API_KEY is not set. Please add it to your .env file.")

    client = genai.Client(api_key=key)

    # Build contents
    contents = prompt

    # Build generation config — 3.8 Flash supports LOW, MEDIUM (default), HIGH
    config_kwargs = {}
    if system:
        from google.genai import types as genai_types
        config_kwargs["system_instruction"] = system

    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=genai.types.GenerateContentConfig(**config_kwargs) if config_kwargs else None,
    )

    return response.text or ""
