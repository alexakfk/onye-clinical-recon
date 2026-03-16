"""Anthropic Claude integration for clinical reasoning.

Prompt Engineering Approach
---------------------------
1. **Role priming** – Each prompt opens with a specific clinical role (pharmacist
   for reconciliation, data-quality analyst for validation) so the model adopts
   domain-appropriate reasoning.
2. **Structured context** – Patient demographics, conditions, and labs are
   provided in a structured block so the model can cross-reference clinical
   factors (e.g. eGFR with nephrotoxic drugs).
3. **Explicit evaluation criteria** – The prompt enumerates the dimensions the
   model must consider (reliability, recency, safety) to prevent open-ended
   wandering.
4. **JSON-only output constraint** – Requesting *only* valid JSON (no markdown)
   reduces post-processing failures and keeps latency low.
5. **Graceful degradation** – When the API is unavailable or returns unparseable
   output, the caller falls back to deterministic rule-based logic.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from app.models import MedicationSource, PatientContext

logger = logging.getLogger(__name__)

_RETRY_ATTEMPTS = 2
_RETRY_BACKOFF = 1.5  # seconds


class AIClient:
    def __init__(self, api_key: str | None = None, model: str = "claude-sonnet-4-20250514"):
        self.model = model
        self.client = None
        if api_key:
            try:
                import anthropic

                self.client = anthropic.Anthropic(api_key=api_key)
            except ImportError:
                logger.warning("anthropic package not installed – AI features disabled")

    @property
    def available(self) -> bool:
        return self.client is not None

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    async def reconcile_medication(
        self,
        patient_context: PatientContext,
        sources: list[MedicationSource],
    ) -> dict | None:
        if not self.available:
            return None
        prompt = self._build_reconciliation_prompt(patient_context, sources)
        return await self._call(prompt)

    async def analyze_data_quality(self, record: dict) -> dict | None:
        if not self.available:
            return None
        prompt = self._build_quality_prompt(record)
        return await self._call(prompt)

    # ------------------------------------------------------------------
    # Prompt builders
    # ------------------------------------------------------------------

    @staticmethod
    def _build_reconciliation_prompt(
        ctx: PatientContext,
        sources: list[MedicationSource],
    ) -> str:
        sources_text = "\n".join(
            f"- {s.system}: {s.medication} "
            f"(reliability: {s.source_reliability}, "
            f"date: {s.last_updated or s.last_filled or 'unknown'})"
            for s in sources
        )
        labs_text = (
            ", ".join(f"{k}: {v}" for k, v in ctx.recent_labs.items())
            or "None available"
        )

        return (
            "You are a board-certified clinical pharmacist reviewing conflicting "
            "medication records for a single patient.\n\n"
            "Patient Context:\n"
            f"- Age: {ctx.age}\n"
            f"- Conditions: {', '.join(ctx.conditions) or 'None listed'}\n"
            f"- Recent Labs: {labs_text}\n\n"
            "Conflicting Medication Records:\n"
            f"{sources_text}\n\n"
            "Determine the MOST LIKELY accurate medication. Consider:\n"
            "1. Source reliability and how recently each record was updated\n"
            "2. Clinical appropriateness given the patient's conditions and labs\n"
            "3. Common prescribing patterns and guideline-based dose adjustments\n"
            "4. Pharmacological safety (contraindications, renal dosing)\n\n"
            "Respond ONLY with valid JSON – no markdown fences, no commentary:\n"
            "{\n"
            '  "reconciled_medication": "drug name and complete dosage",\n'
            '  "confidence_score": <float 0.0–1.0>,\n'
            '  "reasoning": "detailed clinical reasoning",\n'
            '  "recommended_actions": ["action 1", "action 2"],\n'
            '  "clinical_safety_check": "PASSED" or "FAILED: <reason>"\n'
            "}"
        )

    @staticmethod
    def _build_quality_prompt(record: dict) -> str:
        return (
            "You are a healthcare data-quality analyst. Review the following "
            "patient record and identify quality issues.\n\n"
            "Patient Record:\n"
            f"{json.dumps(record, indent=2, default=str)}\n\n"
            "Evaluate these dimensions (score each 0–100):\n"
            "1. Completeness – Are important clinical fields present and populated?\n"
            "2. Accuracy – Are values in valid formats and physiologically possible?\n"
            "3. Timeliness – How current is the data?\n"
            "4. Clinical Plausibility – Do vital signs, medications, and conditions "
            "make clinical sense together?\n\n"
            "Respond ONLY with valid JSON – no markdown fences, no commentary:\n"
            "{\n"
            '  "overall_score": <int 0–100>,\n'
            '  "breakdown": {\n'
            '    "completeness": <int>,\n'
            '    "accuracy": <int>,\n'
            '    "timeliness": <int>,\n'
            '    "clinical_plausibility": <int>\n'
            "  },\n"
            '  "issues_detected": [\n'
            "    {\n"
            '      "field": "field.path",\n'
            '      "issue": "human-readable description",\n'
            '      "severity": "low" | "medium" | "high"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _call(self, prompt: str) -> dict | None:
        """Call Anthropic with retries and back-off."""
        for attempt in range(_RETRY_ATTEMPTS + 1):
            try:
                response = self.client.messages.create(
                    model=self.model,
                    max_tokens=1024,
                    messages=[{"role": "user", "content": prompt}],
                )
                return self._parse_json(response.content[0].text)
            except Exception as exc:
                logger.warning("AI call attempt %d failed: %s", attempt + 1, exc)
                if attempt < _RETRY_ATTEMPTS:
                    time.sleep(_RETRY_BACKOFF * (attempt + 1))
        return None

    @staticmethod
    def _parse_json(text: str) -> dict | None:
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(lines[1:-1])
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            start = text.find("{")
            end = text.rfind("}") + 1
            if start != -1 and end > start:
                try:
                    return json.loads(text[start:end])
                except json.JSONDecodeError:
                    pass
        return None
