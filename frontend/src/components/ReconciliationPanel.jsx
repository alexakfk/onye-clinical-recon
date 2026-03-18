import { useState } from "react";
import { reconcileMedication } from "../api";

const EXAMPLE = {
  patient_context: {
    age: 67,
    conditions: ["Type 2 Diabetes", "Hypertension"],
    recent_labs: { eGFR: 45 },
  },
  sources: [
    {
      system: "Hospital EHR",
      medication: "Metformin 1000mg twice daily",
      last_updated: "2024-10-15",
      source_reliability: "high",
    },
    {
      system: "Primary Care",
      medication: "Metformin 500mg twice daily",
      last_updated: "2025-01-20",
      source_reliability: "high",
    },
    {
      system: "Pharmacy",
      medication: "Metformin 1000mg daily",
      last_filled: "2025-01-25",
      source_reliability: "medium",
    },
  ],
};

function confidenceBadge(score) {
  if (score >= 0.8) return "bg-md-success-container text-md-on-success-container";
  if (score >= 0.5) return "bg-md-warning-container text-md-on-warning-container";
  return "bg-md-error-container text-md-on-error-container";
}

function confidenceBar(score) {
  if (score >= 0.8) return "bg-md-success";
  if (score >= 0.5) return "bg-md-warning";
  return "bg-md-error";
}

function SafetyBadge({ check }) {
  const passed = check.startsWith("PASSED");
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium ${
        passed
          ? "bg-md-success-container text-md-on-success-container"
          : "bg-md-error-container text-md-on-error-container"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${passed ? "bg-md-success" : "bg-md-error"}`}
      />
      {check}
    </span>
  );
}

export default function ReconciliationPanel() {
  const [input, setInput] = useState(JSON.stringify(EXAMPLE, null, 2));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [decision, setDecision] = useState(null);

  async function handleSubmit() {
    setError(null);
    setResult(null);
    setDecision(null);
    setLoading(true);
    try {
      const parsed = JSON.parse(input);
      const data = await reconcileMedication(parsed);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* ── Input ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-md-surface-container rounded-md-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-base font-medium text-md-on-surface">
              Conflicting Medication Records
            </h2>
            <p className="text-sm text-md-on-surface-variant mt-0.5">
              Paste JSON with patient context and medication sources
            </p>
          </div>
          {/* MD3 filled text field: rounded top, flat bottom, bottom border */}
          <div className="px-4 pb-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={22}
              spellCheck={false}
              className="w-full px-4 py-3 font-mono text-sm text-md-on-surface bg-md-surface-variant rounded-t-md-md border-b-2 border-md-outline focus:border-md-primary focus:outline-none resize-none transition-colors duration-200 placeholder:text-md-on-surface-variant/50"
            />
          </div>
        </div>

        {/* MD3 filled button: pill, state layers, tactile press */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-full bg-md-primary text-md-on-primary font-medium text-sm tracking-wide hover:bg-md-primary/90 active:scale-95 active:bg-md-primary/80 disabled:opacity-50 disabled:active:scale-100 transition-all duration-300 ease-md-standard shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2"
        >
          {loading ? "Analyzing" : "Reconcile Medications"}
        </button>

        {error && (
          <div className="px-4 py-3 rounded-md-xl bg-md-error-container text-md-on-error-container text-sm font-medium">
            {error}
          </div>
        )}
      </div>

      {/* ── Results ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="bg-md-surface-container rounded-md-xl shadow-sm p-10 text-center">
            <p className="text-lg text-md-on-surface-variant">
              Submit records to see reconciliation results
            </p>
          </div>
        )}

        {loading && (
          <div className="bg-md-surface-container rounded-md-xl shadow-sm p-10 text-center">
            <div className="inline-block w-10 h-10 border-4 border-md-secondary-container border-t-md-primary rounded-full animate-spin" />
            <p className="mt-4 text-sm text-md-on-surface-variant">
              Running clinical analysis
            </p>
          </div>
        )}

        {result && (
          <>
            {/* Reconciled medication — interactive card with hover elevation */}
            <div className="group bg-md-surface-container rounded-md-xl shadow-sm hover:shadow-md transition-all duration-300 ease-md-standard overflow-hidden">
              <div className="p-6 space-y-4">
                <h2 className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wider">
                  Reconciled Medication
                </h2>
                <p className="text-xl font-medium text-md-on-surface">
                  {result.reconciled_medication}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium ${confidenceBadge(result.confidence_score)}`}
                  >
                    Confidence: {Math.round(result.confidence_score * 100)}%
                  </span>
                  <SafetyBadge check={result.clinical_safety_check} />
                </div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="bg-md-surface-container rounded-md-xl shadow-sm p-6">
              <h3 className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wider mb-3">
                Confidence Level
              </h3>
              <div className="w-full bg-md-surface-variant rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ease-md-standard ${confidenceBar(result.confidence_score)}`}
                  style={{ width: `${result.confidence_score * 100}%` }}
                />
              </div>
              <p className="text-xs text-md-on-surface-variant mt-2 text-right font-medium">
                {Math.round(result.confidence_score * 100)}%
              </p>
            </div>

            {/* Reasoning */}
            <div className="group bg-md-surface-container rounded-md-xl shadow-sm hover:shadow-md transition-all duration-300 ease-md-standard">
              <div className="p-6">
                <h2 className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wider mb-3">
                  Clinical Reasoning
                </h2>
                <p className="text-sm text-md-on-surface leading-relaxed">
                  {result.reasoning}
                </p>
              </div>
            </div>

            {/* Recommended actions */}
            <div className="bg-md-surface-container rounded-md-xl shadow-sm overflow-hidden">
              <div className="p-6 pb-0">
                <h2 className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wider">
                  Recommended Actions
                </h2>
              </div>
              <ul className="p-4 space-y-1">
                {result.recommended_actions.map((action, i) => (
                  <li
                    key={i}
                    className="group/item px-4 py-3 flex items-start gap-3 rounded-md-lg hover:bg-md-primary/5 transition-colors duration-200"
                  >
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md-sm border-2 border-md-outline group-hover/item:border-md-primary transition-colors duration-200" />
                    <span className="text-sm text-md-on-surface group-hover/item:translate-x-0.5 transition-transform duration-200">
                      {action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Approve / Reject — pill buttons */}
            {decision === null ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setDecision("approved")}
                  className="flex-1 h-12 rounded-full bg-md-success text-white font-medium text-sm tracking-wide hover:bg-md-success/90 active:scale-95 active:bg-md-success/80 transition-all duration-300 ease-md-standard shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-success focus-visible:ring-offset-2"
                >
                  Approve Recommendation
                </button>
                <button
                  onClick={() => setDecision("rejected")}
                  className="flex-1 h-12 rounded-full border-2 border-md-error text-md-error font-medium text-sm tracking-wide hover:bg-md-error/10 active:scale-95 active:bg-md-error/5 transition-all duration-300 ease-md-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-error focus-visible:ring-offset-2"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div
                className={`px-6 py-4 rounded-md-xl text-sm font-medium text-center ${
                  decision === "approved"
                    ? "bg-md-success-container text-md-on-success-container"
                    : "bg-md-error-container text-md-on-error-container"
                }`}
              >
                Recommendation{" "}
                {decision === "approved" ? "approved" : "rejected"} by clinician
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
