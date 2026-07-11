import asyncio
import time
import google.generativeai as genai
import google.generativeai.client as genai_client

last_request_time = 0.0
request_lock = asyncio.Lock()

async def space_request(min_interval: float = 4.0):
    """
    Ensures that any API requests are spaced by at least min_interval seconds.
    Crucial for preventing 429 rate limit errors on the Gemini free tier.
    """
    global last_request_time
    async with request_lock:
        now = time.time()
        elapsed = now - last_request_time
        if elapsed < min_interval:
            sleep_time = min_interval - elapsed
            await asyncio.sleep(sleep_time)
        last_request_time = time.time()

async def generate_content_with_fallback(model_name: str, prompt: str, response_mime_type: str = None) -> str:
    """
    Attempts to generate content with the configured model. 
    If a 429 rate limit or daily quota exceeded error occurs, it automatically falls back to 'gemini-3.5-flash'
    or 'gemini-3.1-flash-lite' (to stay within high daily limits on the free tier).
    """
    try:
        model = genai.GenerativeModel(model_name)
        model._client = genai_client.get_default_generative_client()
        
        gen_config = genai.GenerationConfig(response_mime_type=response_mime_type) if response_mime_type else None
        
        response = await model.generate_content_async(
            prompt,
            generation_config=gen_config
        )
        return response.text
    except Exception as e:
        # Check if it's a rate limit or daily quota exceeded error (HTTP 429)
        is_quota_error = False
        if hasattr(e, "code") and e.code == 429:
            is_quota_error = True
        elif "429" in str(e) or "quota" in str(e).lower() or "exhausted" in str(e).lower() or "limit" in str(e).lower():
            is_quota_error = True
            
        fallback_model = "gemini-3.5-flash"
        if model_name == "gemini-3.5-flash":
            fallback_model = "gemini-3.1-flash-lite"
            
        if is_quota_error and model_name != fallback_model:
            print(f"[WARNING] Quota limit hit for model {model_name}. Falling back to stable {fallback_model}...")
            
            # Wait a small delay to clear the rate-limiter and retry with fallback
            await asyncio.sleep(2.0)
            
            model = genai.GenerativeModel(fallback_model)
            model._client = genai_client.get_default_generative_client()
            
            gen_config = genai.GenerationConfig(response_mime_type=response_mime_type) if response_mime_type else None
            response = await model.generate_content_async(
                prompt,
                generation_config=gen_config
            )
            return response.text
        else:
            # Re-raise the exception if fallback is not applicable
            raise e
