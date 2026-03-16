from fastapi import APIRouter, Depends

from app.auth import verify_api_key
from app.models import ReconcileRequest, ReconcileResponse

router = APIRouter()


@router.post(
    "/api/reconcile/medication",
    response_model=ReconcileResponse,
    summary="Reconcile conflicting medication records",
)
async def reconcile_medication(
    request: ReconcileRequest,
    _api_key: str = Depends(verify_api_key),
) -> ReconcileResponse:
    from app.services import reconciliation_service

    return await reconciliation_service.reconcile(request)
