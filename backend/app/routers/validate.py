from fastapi import APIRouter, Depends

from app.auth import verify_api_key
from app.models import DataQualityRequest, DataQualityResponse

router = APIRouter()


@router.post(
    "/api/validate/data-quality",
    response_model=DataQualityResponse,
    summary="Validate patient data quality",
)
async def validate_data_quality(
    request: DataQualityRequest,
    _api_key: str = Depends(verify_api_key),
) -> DataQualityResponse:
    from app.services import data_quality_service

    return await data_quality_service.validate(request)
