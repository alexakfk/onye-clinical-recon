from datetime import date, timedelta

from app.models import DataQualityRequest, Demographics
from app.services.data_quality import DataQualityService


class TestCompleteness:
    def test_empty_allergies_flagged(self):
        req = DataQualityRequest(
            demographics=Demographics(name="Jane Doe", dob="1960-01-01", gender="F"),
            medications=["Metformin 500mg"],
            allergies=[],
            conditions=["Type 2 Diabetes"],
            vital_signs={"heart_rate": 72},
            last_updated=date.today().isoformat(),
        )
        result = DataQualityService.rule_based_validate(req)
        allergy_issues = [i for i in result.issues_detected if i.field == "allergies"]
        assert len(allergy_issues) == 1
        assert allergy_issues[0].severity == "medium"

    def test_complete_record_scores_high(self):
        req = DataQualityRequest(
            demographics=Demographics(name="Jane Doe", dob="1960-01-01", gender="F"),
            medications=["Metformin 500mg"],
            allergies=["Penicillin"],
            conditions=["Type 2 Diabetes"],
            vital_signs={"blood_pressure": "120/80", "heart_rate": 72},
            last_updated=date.today().isoformat(),
        )
        result = DataQualityService.rule_based_validate(req)
        assert result.breakdown.completeness >= 90


class TestAccuracy:
    def test_implausible_blood_pressure_detected(self):
        req = DataQualityRequest(
            vital_signs={"blood_pressure": "340/180"},
            last_updated=date.today().isoformat(),
        )
        result = DataQualityService.rule_based_validate(req)
        bp_issues = [
            i
            for i in result.issues_detected
            if i.field == "vital_signs.blood_pressure"
        ]
        assert len(bp_issues) == 1
        assert bp_issues[0].severity == "high"

    def test_valid_blood_pressure_passes(self):
        req = DataQualityRequest(
            vital_signs={"blood_pressure": "120/80"},
            last_updated=date.today().isoformat(),
        )
        result = DataQualityService.rule_based_validate(req)
        bp_issues = [
            i
            for i in result.issues_detected
            if i.field == "vital_signs.blood_pressure"
        ]
        assert len(bp_issues) == 0


class TestTimeliness:
    def test_recent_data_scores_high(self):
        req = DataQualityRequest(last_updated=date.today().isoformat())
        result = DataQualityService.rule_based_validate(req)
        assert result.breakdown.timeliness == 100

    def test_stale_data_flagged(self):
        old_date = (date.today() - timedelta(days=300)).isoformat()
        req = DataQualityRequest(last_updated=old_date)
        result = DataQualityService.rule_based_validate(req)
        assert result.breakdown.timeliness < 70
        stale_issues = [
            i for i in result.issues_detected if i.field == "last_updated"
        ]
        assert len(stale_issues) >= 1
