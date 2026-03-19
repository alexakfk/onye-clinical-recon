# Clinical Data Reconciliation Engine

A full-stack application that uses AI to reconcile conflicting clinical data from multiple healthcare systems and validate patient record quality.

## Architecture

```
backend/          Python / FastAPI REST API
├── app/
│   ├── main.py          FastAPI app with CORS
│   ├── config.py        Environment-based settings
│   ├── auth.py          API-key authentication
│   ├── models.py        Pydantic request/response schemas
│   ├── services/
│   │   ├── ai_client.py       Anthropic Claude integration
│   │   ├── cache.py           In-memory TTL cache
│   │   ├── reconciliation.py  Medication reconciliation engine
│   │   └── data_quality.py    Data quality scorer
│   └── routers/
│       ├── reconcile.py       POST /api/reconcile/medication
│       └── validate.py        POST /api/validate/data-quality
└── tests/               10 unit tests

frontend/         React / Vite / Tailwind CSS
├── src/
│   ├── App.jsx              Tab layout
│   ├── api.js               API client
│   └── components/
│       ├── ReconciliationPanel.jsx
│       └── DataQualityPanel.jsx
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) Anthropic API key for AI-powered reasoning

### 1. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Configure (optional – works without an API key via rule-based fallback)
cp .env.example .env
# Edit .env to add your ANTHROPIC_API_KEY

uvicorn app.main:app --reload
```

The API is now running at **http://localhost:8000**. Interactive docs at `/docs`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` requests to the backend.

### 3. Docker (alternative)

```bash
cp backend/.env.example backend/.env   # edit as needed
docker compose up --build
```

### Running Tests

```bash
cd backend
pytest -v
```

## API Endpoints

### `POST /api/reconcile/medication`

Reconcile conflicting medication records from different source systems.

**Headers:** `X-API-Key: dev-api-key`

<details>
<summary>Example request</summary>

```json
{
  "patient_context": {
    "age": 67,
    "conditions": ["Type 2 Diabetes", "Hypertension"],
    "recent_labs": {"eGFR": 45}
  },
  "sources": [
    {
      "system": "Hospital EHR",
      "medication": "Metformin 1000mg twice daily",
      "last_updated": "2024-10-15",
      "source_reliability": "high"
    },
    {
      "system": "Primary Care",
      "medication": "Metformin 500mg twice daily",
      "last_updated": "2025-01-20",
      "source_reliability": "high"
    }
  ]
}
```
</details>

**Response:** Reconciled medication, confidence score (0–1), clinical reasoning, recommended actions, and safety check status.

### `POST /api/validate/data-quality`

Score a patient record across four quality dimensions.

**Headers:** `X-API-Key: dev-api-key`

**Response:** Overall score (0–100), breakdown (completeness, accuracy, timeliness, clinical plausibility), and a list of detected issues with severity.

## LLM Choice: Anthropic Claude

The engine uses **Anthropic Claude** (claude-sonnet-4-20250514 by default) for:

1. **Clinical reasoning** – generating evidence-based explanations for reconciliation decisions
2. **Implausible data detection** – catching impossible vitals, drug–disease mismatches
3. **Human-readable explanations** – producing clinician-friendly summaries

**Why Claude?**

- Strong clinical and biomedical reasoning from pretraining
- Reliable structured JSON output with minimal prompt engineering
- Clear, cautious language style appropriate for healthcare context
- Good balance of speed and quality on the Sonnet tier

### Prompt Engineering Approach

Each prompt follows a consistent pattern (see `ai_client.py` docstring):

| Technique | Purpose |
|---|---|
| **Role priming** | Set clinical role (pharmacist / data-quality analyst) |
| **Structured context** | Present patient data in a cross-referenceable format |
| **Explicit criteria** | List evaluation dimensions to prevent open-ended drift |
| **JSON-only output** | Eliminate markdown/commentary for clean parsing |
| **Graceful fallback** | Rule-based logic runs when AI is unavailable or returns bad JSON |

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Hybrid AI + rule-based** | The engine always produces results, even without an API key. Rule-based scoring runs first; AI enriches the output when available. |
| **Weighted source scoring** | Sources are scored with 40% reliability + 60% recency, reflecting that the most recent clinical encounter is usually most accurate. |
| **In-memory TTL cache** | Identical requests return cached results to reduce API costs and latency. Cache is keyed by SHA-256 hash of the request body. |
| **Clinical safety checks** | Rule-based guard rails (e.g., Metformin + low eGFR) run independently of AI to catch dangerous recommendations. |
| **Lazy service imports** | Router endpoints import services lazily to avoid circular imports and make testing easier. |
| **Vite proxy** | The frontend dev server proxies `/api` to the backend, avoiding CORS issues during development. |

## Trade-offs

- **No persistent database** – In-memory storage keeps the project simple but data is lost on restart. A production version would use PostgreSQL or similar.
- **Synchronous Anthropic client** – The official Python SDK's sync `messages.create` is called within an async endpoint. For high-throughput, the async client or a thread pool would be preferable.
- **No RBAC** – A single API key secures all endpoints. A production system would need role-based access control.
- **Rule-based fallback is conservative** – Without AI, the engine picks the highest-scored source but cannot reason about complex drug interactions.

## What I'd Improve with More Time

- **Persistent storage** – Replace the in-memory cache with PostgreSQL or Redis so reconciliation history, clinician approve/reject decisions, and audit trails survive restarts. This would also enable tracking how often AI suggestions are overridden.
- **Async Anthropic client** – Swap the synchronous `messages.create` call for the async variant (`AsyncAnthropic`) so the event loop isn't blocked during LLM inference, improving throughput under concurrent requests.
- **Confidence score calibration** – The rule-based confidence score is a simple linear blend of reliability and recency. A more sophisticated model would weight source agreement (do multiple sources corroborate each other?), clinical severity, and historical accuracy of each source system.
- **Duplicate record detection** – Add a fuzzy matching layer (e.g., Levenshtein distance on medication names, phonetic matching) to detect when two sources are reporting the same drug with slightly different spellings or formats before reconciliation.
- **Role-based access control** – Replace the single shared API key with JWT-based auth and user roles (clinician, pharmacist, admin) so approve/reject actions are attributed and permissions are scoped.
- **Webhook support** – Allow external systems to subscribe to reconciliation events so downstream EHRs can be notified in real-time when a medication record is reconciled.
- **Expanded clinical safety rules** – The rule-based safety check currently only covers Metformin + low eGFR. A production system would need a broader formulary of drug–condition, drug–drug, and drug–allergy interaction checks.
- **End-to-end and integration tests** – The current suite covers unit logic and API contracts. I'd add Playwright or Cypress tests for the frontend flows (submit, approve/reject, tab switching) and integration tests that exercise the full AI path with mocked Anthropic responses.
- **Production frontend build** – Serve the Vite production build (`npm run build`) as static files from the FastAPI backend, eliminating the need for a separate frontend server in deployment.

## Estimated Time Spent

| Phase | Time |
|---|---|
| Backend architecture, models, services | ~2 hours |
| AI integration and prompt engineering | ~1 hour |
| Frontend dashboard (React + Tailwind) | ~2 hours |
| Material You design system + Onye branding | ~1.5 hours |
| Tests (17 unit tests) | ~0.5 hours |
| Docker, README, project polish | ~0.5 hours |
| **Total** | **~7.5 hours** |
