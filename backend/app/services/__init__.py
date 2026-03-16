from app.config import get_settings
from app.services.cache import Cache
from app.services.ai_client import AIClient
from app.services.reconciliation import ReconciliationService
from app.services.data_quality import DataQualityService

_settings = get_settings()

cache = Cache(ttl_seconds=_settings.cache_ttl_seconds)
ai_client = AIClient(api_key=_settings.anthropic_api_key, model=_settings.ai_model)
reconciliation_service = ReconciliationService(ai_client, cache)
data_quality_service = DataQualityService(ai_client, cache)
