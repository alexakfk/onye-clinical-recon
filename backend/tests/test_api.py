RECONCILE_URL = "/api/reconcile/medication"
VALIDATE_URL = "/api/validate/data-quality"

SAMPLE_RECONCILE = {
    "patient_context": {
        "age": 67,
        "conditions": ["Type 2 Diabetes", "Hypertension"],
        "recent_labs": {"eGFR": 45},
    },
    "sources": [
        {
            "system": "Hospital EHR",
            "medication": "Metformin 1000mg twice daily",
            "last_updated": "2024-10-15",
            "source_reliability": "high",
        },
        {
            "system": "Primary Care",
            "medication": "Metformin 500mg twice daily",
            "last_updated": "2025-01-20",
            "source_reliability": "high",
        },
    ],
}

SAMPLE_QUALITY = {
    "demographics": {"name": "John Doe", "dob": "1955-03-15", "gender": "M"},
    "medications": ["Metformin 500mg", "Lisinopril 10mg"],
    "allergies": [],
    "conditions": ["Type 2 Diabetes"],
    "vital_signs": {"blood_pressure": "340/180", "heart_rate": 72},
    "last_updated": "2024-06-15",
}


class TestAuthentication:
    def test_missing_api_key_returns_401(self, client):
        resp = client.post(RECONCILE_URL, json=SAMPLE_RECONCILE)
        assert resp.status_code == 401

    def test_wrong_api_key_returns_401(self, client):
        resp = client.post(
            RECONCILE_URL,
            json=SAMPLE_RECONCILE,
            headers={"X-API-Key": "wrong-key"},
        )
        assert resp.status_code == 401


class TestReconcileEndpoint:
    def test_returns_reconciled_result(self, client, auth_headers):
        resp = client.post(RECONCILE_URL, json=SAMPLE_RECONCILE, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "reconciled_medication" in data
        assert 0 <= data["confidence_score"] <= 1
        assert isinstance(data["recommended_actions"], list)

    def test_rejects_single_source(self, client, auth_headers):
        payload = {
            "patient_context": {"age": 50, "conditions": []},
            "sources": [
                {"system": "A", "medication": "Aspirin 81mg", "source_reliability": "high"}
            ],
        }
        resp = client.post(RECONCILE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 422


class TestValidateEndpoint:
    def test_returns_quality_scores(self, client, auth_headers):
        resp = client.post(VALIDATE_URL, json=SAMPLE_QUALITY, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert 0 <= data["overall_score"] <= 100
        assert "completeness" in data["breakdown"]
        assert isinstance(data["issues_detected"], list)
        assert len(data["issues_detected"]) > 0
