from __future__ import annotations

from datetime import date, datetime

from app.models import (
    MedicationSource,
    ReconcileRequest,
    ReconcileResponse,
)
from app.services.ai_client import AIClient
from app.services.cache import Cache

RELIABILITY_WEIGHTS: dict[str, float] = {"high": 1.0, "medium": 0.7, "low": 0.4}


class ReconciliationService:
    def __init__(self, ai_client: AIClient, cache: Cache):
        self.ai = ai_client
        self.cache = cache

    async def reconcile(self, request: ReconcileRequest) -> ReconcileResponse:
        cache_key = self.cache.compute_key("reconcile", request.model_dump())
        cached = self.cache.get(cache_key)
        if cached:
            return ReconcileResponse(**cached)

        scored = self.score_sources(request.sources)
        best = max(scored, key=lambda s: s["score"])

        ai_result = await self.ai.reconcile_medication(
            request.patient_context, request.sources
        )

        if ai_result:
            result = ReconcileResponse(
                reconciled_medication=ai_result.get(
                    "reconciled_medication", best["source"].medication
                ),
                confidence_score=round(
                    ai_result.get("confidence_score", best["score"]), 2
                ),
                reasoning=ai_result.get("reasoning", ""),
                recommended_actions=ai_result.get("recommended_actions", []),
                clinical_safety_check=ai_result.get(
                    "clinical_safety_check", "PASSED"
                ),
            )
        else:
            result = self._rule_based_reconcile(request, scored, best)

        self.cache.set(cache_key, result.model_dump())
        return result

    # ------------------------------------------------------------------
    # Scoring helpers (public for testability)
    # ------------------------------------------------------------------

    @staticmethod
    def score_sources(sources: list[MedicationSource]) -> list[dict]:
        scored: list[dict] = []
        for src in sources:
            reliability = RELIABILITY_WEIGHTS.get(src.source_reliability, 0.5)
            recency = ReconciliationService.recency_score(
                src.last_updated or src.last_filled
            )
            composite = reliability * 0.4 + recency * 0.6
            scored.append(
                {
                    "source": src,
                    "score": round(composite, 2),
                    "reliability": reliability,
                    "recency": recency,
                }
            )
        return scored

    @staticmethod
    def recency_score(date_str: str | None) -> float:
        if not date_str:
            return 0.3
        try:
            d = datetime.strptime(date_str, "%Y-%m-%d").date()
            days_old = max((date.today() - d).days, 0)
        except ValueError:
            return 0.3

        if days_old <= 30:
            return 1.0
        if days_old <= 90:
            return 0.8
        if days_old <= 180:
            return 0.6
        if days_old <= 365:
            return 0.4
        return 0.2

    # ------------------------------------------------------------------
    # Rule-based fallback
    # ------------------------------------------------------------------

    @staticmethod
    def _rule_based_reconcile(
        request: ReconcileRequest,
        scored: list[dict],
        best: dict,
    ) -> ReconcileResponse:
        actions: list[str] = []
        for item in scored:
            if item["source"].medication != best["source"].medication:
                actions.append(
                    f"Update {item['source'].system} to reflect reconciled medication"
                )
        if not actions:
            actions.append("Verify reconciled medication with prescribing clinician")

        reasoning_parts = [
            f"Selected '{best['source'].medication}' from {best['source'].system}.",
            f"Source scored highest (reliability: {best['reliability']}, "
            f"recency: {best['recency']}).",
        ]

        safety = "PASSED"
        labs = request.patient_context.recent_labs
        med_lower = best["source"].medication.lower()

        egfr = labs.get("eGFR") or labs.get("egfr")
        if egfr is not None and "metformin" in med_lower:
            if egfr < 30:
                safety = "FAILED: Metformin contraindicated with eGFR < 30"
            elif egfr < 45:
                reasoning_parts.append(
                    "Note: eGFR < 45 may warrant Metformin dose reduction."
                )

        return ReconcileResponse(
            reconciled_medication=best["source"].medication,
            confidence_score=round(best["score"], 2),
            reasoning=" ".join(reasoning_parts),
            recommended_actions=actions,
            clinical_safety_check=safety,
        )
