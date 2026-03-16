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
