import os
import json
import hashlib
import logging
import time
from typing import Dict, Any, Optional
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError
from services.ai_router import select_model

load_dotenv()

logger = logging.getLogger("GeminiService")

# Simple in-memory response cache to optimize API usage
_response_cache: Dict[str, Any] = {}

# Set of standard/supported Gemini models
SUPPORTED_MODELS = {
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-1.5-flash",
    "gemini-1.5-pro",
}

def validate_model_name(model_name: str) -> str:
    """
    Validates model name and returns a safe fallback model if invalid/unsupported.
    """
    if model_name in SUPPORTED_MODELS:
        return model_name
    logger.warning(f"Model name '{model_name}' is not in the supported list. Defaulting to 'gemini-2.5-flash'")
    return "gemini-2.5-flash"

def get_gemini_client() -> Optional[genai.Client]:
    """
    Initializes and returns the Gemini client using the API key.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY is not defined in environment variables.")
        return None
    try:
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.error(f"Error initializing Gemini client: {e}")
        return None

def parse_json_response(response_text: str) -> Dict[str, Any]:
    """
    Clean and parse JSON from the Gemini response text, handling markdown blocks and standard issues.
    """
    cleaned_text = response_text.strip()
    
    # Remove markdown code fences if present (e.g. ```json ... ```)
    if cleaned_text.startswith("```"):
        lines = cleaned_text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        cleaned_text = "\n".join(lines).strip()
        
    # Attempt standard parsing
    try:
        return json.loads(cleaned_text)
    except json.JSONDecodeError:
        pass
        
    # Try to extract the first valid-looking JSON object or array
    try:
        start_obj = cleaned_text.find('{')
        end_obj = cleaned_text.rfind('}')
        
        start_arr = cleaned_text.find('[')
        end_arr = cleaned_text.rfind(']')
        
        start, end = -1, -1
        if start_obj != -1 and (start_arr == -1 or start_obj < start_arr):
            start, end = start_obj, end_obj + 1
        elif start_arr != -1:
            start, end = start_arr, end_arr + 1
            
        if start != -1 and end > start:
            json_str = cleaned_text[start:end]
            return json.loads(json_str)
    except Exception as e:
        logger.warning(f"JSON extraction substring method failed: {e}")
        
    raise ValueError(f"Response could not be parsed as valid JSON. Raw text length: {len(response_text)}")

def call_gemini_with_retry(client: genai.Client, model: str, prompt: str, config: Dict[str, Any], retries: int = 3, backoff_factor: float = 1.5) -> Any:
    """
    Executes a Gemini generate_content call with retry logic and exponential backoff
    for rate limits (429) or transient server errors (5xx).
    """
    delay = 1.0
    last_exception = None
    for attempt in range(retries):
        try:
            logger.info(f"Generating content using {model} (attempt {attempt + 1}/{retries})...")
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=config
            )
            return response
        except APIError as ae:
            last_exception = ae
            status_code = getattr(ae, "code", None)
            logger.warning(f"Gemini APIError on attempt {attempt + 1}: status={status_code}, message={str(ae)}")
            # Retry on rate limit (429) or server errors (500, 503, 504)
            if status_code in (429, 500, 503, 504) or "rate limit" in str(ae).lower():
                time.sleep(delay)
                delay *= backoff_factor
            else:
                # Other API errors (e.g. invalid key, forbidden, model not found) - fail fast
                raise ae
        except Exception as e:
            last_exception = e
            logger.warning(f"Unexpected error calling Gemini API on attempt {attempt + 1}: {str(e)}")
            time.sleep(delay)
            delay *= backoff_factor
            
    raise last_exception

def route_gemini_request(prompt: str, mode: str = None, query: str = None, use_cache: bool = True) -> Dict[str, Any]:
    """
    Routes the request to the appropriate Gemini model (gemini-2.5-flash or gemini-2.5-pro)
    using the ai_router, and calls the Gemini API with retry logic and fallbacks.
    """
    # Select model using the router
    model_name, routing_desc = select_model(query=query, mode=mode)
    model_name = validate_model_name(model_name)
    
    # Check cache to optimize API usage and cost
    cache_key = hashlib.md5(f"{model_name}:{prompt}".encode('utf-8')).hexdigest()
    if use_cache and cache_key in _response_cache:
        logger.info(f"Returning cached Gemini response for {model_name}")
        cached_result = _response_cache[cache_key].copy()
        cached_result["_model_routed"] = model_name
        cached_result["_routing_desc"] = routing_desc + " (cached)"
        return cached_result
        
    client = get_gemini_client()
    if not client:
        return {"error": "Gemini API Client is not configured. Check GEMINI_API_KEY."}
        
    try:
        response = call_gemini_with_retry(
            client=client,
            model=model_name,
            prompt=prompt,
            config={'response_mime_type': 'application/json'}
        )
        
        response_text = getattr(response, "text", "")
        if not response_text:
            return {"error": "Empty response received from Gemini API."}
            
        data = parse_json_response(response_text)
        data["_model_routed"] = model_name
        data["_routing_desc"] = routing_desc
        
        if use_cache:
            _response_cache[cache_key] = data.copy()
            
        return data
        
    except Exception as e:
        logger.error(f"Error calling Gemini API ({model_name}): {e}")
        # Fallback to gemini-1.5-flash if 2.5 pro/flash fail or are not available
        fallback_model = "gemini-1.5-flash"
        logger.info(f"Attempting fallback to {fallback_model}...")
        try:
            response = call_gemini_with_retry(
                client=client,
                model=fallback_model,
                prompt=prompt,
                config={'response_mime_type': 'application/json'}
            )
            response_text = getattr(response, "text", "")
            if not response_text:
                return {"error": "Empty response received from Gemini API during fallback."}
                
            data = parse_json_response(response_text)
            data["_model_routed"] = fallback_model + " (fallback)"
            data["_routing_desc"] = routing_desc + f" -> Fallback to {fallback_model}"
            if use_cache:
                _response_cache[cache_key] = data.copy()
            return data
        except Exception as fe:
            logger.error(f"Fallback to {fallback_model} also failed: {fe}")
            return {
                "error": f"API Error: {str(e)}. Fallback Error: {str(fe)}",
                "_model_routed": model_name,
                "_routing_desc": routing_desc
            }

