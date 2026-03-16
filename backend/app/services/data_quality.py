from __future__ import annotations

import re
from datetime import date, datetime

from app.models import (
    DataIssue,
    DataQualityRequest,
    DataQualityResponse,
    QualityBreakdown,
)
from app.services.ai_client import AIClient
from app.services.cache import Cache


class DataQualityService:
    def __init__(self, ai_client: AIClient, cache: Cache):
        self.ai = ai_client
        self.cache = cache

    async def validate(self, request: DataQualityRequest) -> DataQualityResponse:
        cache_key = self.cache.compute_key("quality", request.model_dump())
        cached = self.cache.get(cache_key)
        if cached:
            return DataQualityResponse(**cached)

        ai_result = await self.ai.analyze_data_quality(request.model_dump())

        if ai_result:
            try:
                result = DataQualityResponse(
                    overall_score=ai_result["overall_score"],
                    breakdown=QualityBreakdown(**ai_result["breakdown"]),
                    issues_detected=[
                        DataIssue(**i) for i in ai_result["issues_detected"]
                    ],
                )
            except (KeyError, TypeError):
                result = self.rule_based_validate(request)
        else:
            result = self.rule_based_validate(request)

        self.cache.set(cache_key, result.model_dump())
        return result

    # ------------------------------------------------------------------
    # Rule-based validation (public for direct testing)
    # ------------------------------------------------------------------

    @classmethod
    def rule_based_validate(cls, request: DataQualityRequest) -> DataQualityResponse:
        issues: list[DataIssue] = []

        completeness = cls._score_completeness(request, issues)
        accuracy = cls._score_accuracy(request, issues)
        timeliness = cls._score_timeliness(request, issues)
        plausibility = cls._score_plausibility(request, issues)

        overall = round(
            completeness * 0.25
            + accuracy * 0.25
            + timeliness * 0.25
            + plausibility * 0.25
        )

        return DataQualityResponse(
            overall_score=overall,
            breakdown=QualityBreakdown(
                completeness=completeness,
                accuracy=accuracy,
                timeliness=timeliness,
                clinical_plausibility=plausibility,
            ),
            issues_detected=issues,
        )

    # ------------------------------------------------------------------
    # Dimension scorers
    # ------------------------------------------------------------------

    @staticmethod
    def _score_completeness(req: DataQualityRequest, issues: list[DataIssue]) -> int:
        score = 100
        checks: dict[str, object] = {
            "demographics": req.demographics,
            "medications": req.medications,
            "allergies": req.allergies,
            "conditions": req.conditions,
            "vital_signs": req.vital_signs,
            "last_updated": req.last_updated,
        }

        for field, value in checks.items():
            if value is None or (isinstance(value, (list, dict)) and len(value) == 0):
                severity = "medium"
                if field == "allergies":
                    msg = "No allergies documented - likely incomplete"
                else:
                    msg = f"{field} is missing or empty"
                issues.append(DataIssue(field=field, issue=msg, severity=severity))
                score -= 15 if field == "allergies" else 10

        if req.demographics:
            for attr in ("name", "dob", "gender"):
                if not getattr(req.demographics, attr, None):
                    issues.append(
                        DataIssue(
                            field=f"demographics.{attr}",
                            issue=f"Demographics {attr} is missing",
                            severity="low",
                        )
                    )
                    score -= 5

        return _clamp(score)

    @staticmethod
    def _score_accuracy(req: DataQualityRequest, issues: list[DataIssue]) -> int:
        score = 100

        if req.demographics and req.demographics.dob:
            try:
                dob = datetime.strptime(req.demographics.dob, "%Y-%m-%d").date()
                if dob > date.today():
                    issues.append(
                        DataIssue(
                            field="demographics.dob",
                            issue="Date of birth is in the future",
                            severity="high",
                        )
                    )
                    score -= 30
                elif (date.today() - dob).days > 365 * 130:
                    issues.append(
                        DataIssue(
                            field="demographics.dob",
                            issue="Date of birth implies age > 130 years",
                            severity="high",
                        )
                    )
                    score -= 30
            except ValueError:
                issues.append(
                    DataIssue(
                        field="demographics.dob",
                        issue="Date of birth format is invalid (expected YYYY-MM-DD)",
                        severity="medium",
                    )
                )
                score -= 15

        if req.vital_signs:
            bp = req.vital_signs.get("blood_pressure")
            if bp and isinstance(bp, str):
                m = re.match(r"(\d+)/(\d+)", bp)
                if m:
                    sys_bp, dia_bp = int(m.group(1)), int(m.group(2))
                    if sys_bp > 250 or sys_bp < 60 or dia_bp > 150 or dia_bp < 30:
                        issues.append(
                            DataIssue(
                                field="vital_signs.blood_pressure",
                                issue=f"Blood pressure {bp} is physiologically implausible",
                                severity="high",
                            )
                        )
                        score -= 30

            hr = req.vital_signs.get("heart_rate")
            if hr is not None:
                try:
                    hr_val = float(hr)
                    if hr_val < 20 or hr_val > 250:
                        issues.append(
                            DataIssue(
                                field="vital_signs.heart_rate",
                                issue=f"Heart rate {hr_val} is physiologically implausible",
                                severity="high",
                            )
                        )
                        score -= 25
                except (ValueError, TypeError):
                    pass

        return _clamp(score)

    @staticmethod
    def _score_timeliness(req: DataQualityRequest, issues: list[DataIssue]) -> int:
        if not req.last_updated:
            return 50
        try:
            updated = datetime.strptime(req.last_updated, "%Y-%m-%d").date()
            days_old = (date.today() - updated).days
        except ValueError:
            return 50

        if days_old < 0:
            return 100
        if days_old <= 30:
            return 100
        if days_old <= 90:
            return 85
        if days_old <= 180:
            return 70

        months = days_old // 30
        issues.append(
            DataIssue(
                field="last_updated",
                issue=f"Data is {months}+ months old",
                severity="medium",
            )
        )
        return max(20, 70 - (days_old - 180) // 10)

    @staticmethod
    def _score_plausibility(req: DataQualityRequest, issues: list[DataIssue]) -> int:
        score = 100
        meds_lower = [m.lower() for m in req.medications]
        conds_lower = [c.lower() for c in req.conditions]

        diabetes_drugs = [
            "metformin", "insulin", "glipizide", "glyburide", "sitagliptin",
            "empagliflozin", "dapagliflozin", "semaglutide",
        ]
        has_diabetes_drug = any(
            any(d in m for d in diabetes_drugs) for m in meds_lower
        )
        has_diabetes = any("diabetes" in c for c in conds_lower)
        if has_diabetes_drug and not has_diabetes:
            issues.append(
                DataIssue(
                    field="medications",
                    issue="Diabetes medication prescribed without documented diabetes diagnosis",
                    severity="medium",
                )
            )
            score -= 15

        bp_drugs = [
            "lisinopril", "amlodipine", "losartan", "metoprolol",
            "atenolol", "hydrochlorothiazide", "valsartan",
        ]
        has_bp_drug = any(any(d in m for d in bp_drugs) for m in meds_lower)
        has_hypertension = any(
            "hypertension" in c or "high blood pressure" in c for c in conds_lower
        )
        if has_bp_drug and not has_hypertension:
            issues.append(
                DataIssue(
                    field="medications",
                    issue="Antihypertensive prescribed without documented hypertension",
                    severity="low",
                )
            )
            score -= 10

        return _clamp(score)


def _clamp(value: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, value))
