from pydantic_settings import BaseSettings
from functools import lru_cache

# We use BaseSettings from pydantic to handle our environment variables.
# Pydantic will automatically read from a .env file and validate the types.
class Settings(BaseSettings):
    # The Database URL for connecting to PostgreSQL (Supabase)
    # We expect a string like: postgresql://user:password@host:port/dbname
    DATABASE_URL: str = ""

    # ---------------------------------------------------------
    # API KEYS - Distributed to avoid rate limits
    # ---------------------------------------------------------
    
    # Key 1: Used for the heavy Map phase (Worker Agent).
    # This key will take the most abuse as it summarizes every single file.
    GEMINI_API_KEY_MAP: str = ""
    
    # Key 2: Used for the Reduce phase (Master Explainer & Security Agent).
    # This key requires the massive 2M context window but is called less frequently.
    GEMINI_API_KEY_REDUCE: str = ""
    
    # Key 3: Used for generating Embeddings and answering RAG Q/A.
    # This key needs to be fast and responsive for user chats.
    GEMINI_API_KEY_RAG: str = ""
    
    # Optional Fallback Keys: Used if any of the main keys are invalid or exhausted.
    GEMINI_API_KEY_MAP_FALLBACK: str = ""
    GEMINI_API_KEY_REDUCE_FALLBACK: str = ""
    GEMINI_API_KEY_RAG_FALLBACK: str = ""

    # ---------------------------------------------------------
    # MODEL CONFIGURATIONS - Defaulting to latest GA models
    # ---------------------------------------------------------
    GEMINI_MODEL_MAP: str = "gemini-3.1-flash-lite"
    GEMINI_MODEL_REDUCE: str = "gemini-3.5-flash"
    GEMINI_MODEL_RAG: str = "gemini-3.5-flash"

    # The Firebase Project ID, used to verify authentications
    FIREBASE_PROJECT_ID: str = "code-reviewer-9019f"

    class Config:
        # Tells pydantic to load variables from a file named ".env"
        env_file = ".env"

# @lru_cache ensures that we only instantiate the Settings class ONCE.
# Whenever we call get_settings() throughout our app, it returns the same cached instance,
# which saves performance and avoids re-reading the .env file repeatedly.
@lru_cache()
def get_settings():
    settings = Settings()
    # Clean all string values in settings to remove any accidental quotes or whitespace
    for key, value in list(settings.__dict__.items()):
        if isinstance(value, str):
            setattr(settings, key, value.strip().strip("'\""))
    return settings
