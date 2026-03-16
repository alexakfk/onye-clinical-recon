from datetime import date, timedelta

from app.models import MedicationSource, PatientContext, ReconcileRequest
from app.services.reconciliation import ReconciliationService


def _make_source(**overrides) -> MedicationSource:
    defaults = {
        "system": "Test System",
        "medication": "Aspirin 81mg daily",
        "last_updated": date.today().isoformat(),
        "source_reliability": "high",
    }
    defaults.update(overrides)
    return MedicationSource(**defaults)


class TestSourceScoring:
    def test_high_reliability_recent_scores_highest(self):
        sources = [
            _make_source(
                system="A",
                source_reliability="high",
                last_updated=date.today().isoformat(),
            ),
            _make_source(
                system="B",
                source_reliability="low",
                last_updated=(date.today() - timedelta(days=200)).isoformat(),
            ),
        ]
        scored = ReconciliationService.score_sources(sources)
        scores = {s["source"].system: s["score"] for s in scored}
        assert scores["A"] > scores["B"]

    def test_recency_trumps_reliability_when_much_newer(self):
        sources = [
            _make_source(
                system="Old-High",
                source_reliability="high",
                last_updated=(date.today() - timedelta(days=400)).isoformat(),
            ),
            _make_source(
                system="New-Medium",
                source_reliability="medium",
                last_updated=date.today().isoformat(),
            ),
        ]
        scored = ReconciliationService.score_sources(sources)
        scores = {s["source"].system: s["score"] for s in scored}
        assert scores["New-Medium"] > scores["Old-High"]

    def test_missing_date_gets_low_recency(self):
        score = ReconciliationService.recency_score(None)
        assert score == 0.3

    def test_recent_date_gets_high_recency(self):
        score = ReconciliationService.recency_score(date.today().isoformat())
        assert score == 1.0


class TestRuleBasedReconciliation:
    def test_selects_best_scored_medication(self):
        request = ReconcileRequest(
            patient_context=PatientContext(age=60, conditions=["Hypertension"]),
            sources=[
                _make_source(
                    system="Hospital",
                    medication="Lisinopril 20mg",
                    source_reliability="medium",
                    last_updated=(date.today() - timedelta(days=120)).isoformat(),
                ),
                _make_source(
                    system="Clinic",
                    medication="Lisinopril 10mg",
                    source_reliability="high",
                    last_updated=date.today().isoformat(),
                ),
            ],
        )
        scored = ReconciliationService.score_sources(request.sources)
        best = max(scored, key=lambda s: s["score"])
        result = ReconciliationService._rule_based_reconcile(request, scored, best)

        assert result.reconciled_medication == "Lisinopril 10mg"
        assert result.clinical_safety_check == "PASSED"
        assert 0 < result.confidence_score <= 1.0

    def test_metformin_safety_flag_low_egfr(self):
        request = ReconcileRequest(
            patient_context=PatientContext(
                age=72,
                conditions=["Type 2 Diabetes"],
                recent_labs={"eGFR": 25},
            ),
            sources=[
                _make_source(medication="Metformin 1000mg twice daily"),
                _make_source(medication="Metformin 500mg daily"),
            ],
        )
        scored = ReconciliationService.score_sources(request.sources)
        best = max(scored, key=lambda s: s["score"])
        result = ReconciliationService._rule_based_reconcile(request, scored, best)

        assert "FAILED" in result.clinical_safety_check
