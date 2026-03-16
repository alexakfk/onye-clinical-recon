import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        self.anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "")
        self.api_key: str = os.getenv("API_KEY", "dev-api-key")
        self.cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "3600"))
        self.ai_model: str = os.getenv("AI_MODEL", "claude-sonnet-4-20250514")
        self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"


_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()
    return _settings
