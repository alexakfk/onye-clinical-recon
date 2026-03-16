from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any


# ---------------------------------------------------------------------------
# Medication Reconciliation
# ---------------------------------------------------------------------------

class PatientContext(BaseModel):
    age: int
    conditions: list[str] = []
    recent_labs: dict[str, float] = {}


class MedicationSource(BaseModel):
    system: str
    medication: str
    last_updated: str | None = None
    last_filled: str | None = None
    source_reliability: str = "medium"


class ReconcileRequest(BaseModel):
    patient_context: PatientContext
    sources: list[MedicationSource] = Field(..., min_length=2)


class ReconcileResponse(BaseModel):
    reconciled_medication: str
    confidence_score: float
    reasoning: str
    recommended_actions: list[str]
    clinical_safety_check: str


# ---------------------------------------------------------------------------
# Data Quality Validation
# ---------------------------------------------------------------------------

class Demographics(BaseModel):
    name: str | None = None
    dob: str | None = None
    gender: str | None = None


class DataQualityRequest(BaseModel):
    demographics: Demographics | None = None
    medications: list[str] = []
    allergies: list[str] = []
    conditions: list[str] = []
    vital_signs: dict[str, Any] | None = None
    last_updated: str | None = None


class QualityBreakdown(BaseModel):
    completeness: int
    accuracy: int
    timeliness: int
    clinical_plausibility: int


class DataIssue(BaseModel):
    field: str
    issue: str
    severity: str


class DataQualityResponse(BaseModel):
    overall_score: int
    breakdown: QualityBreakdown
    issues_detected: list[DataIssue]
