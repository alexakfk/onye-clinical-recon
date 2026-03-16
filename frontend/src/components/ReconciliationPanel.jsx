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

function confidenceColor(score) {
  if (score >= 0.8) return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (score >= 0.5) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function safetyBadge(check) {
  const passed = check.startsWith("PASSED");
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
        passed
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-red-50 text-red-700 border border-red-200"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${passed ? "bg-emerald-500" : "bg-red-500"}`} />
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
      {/* Input section */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">
              Conflicting Medication Records
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste JSON with patient context and medication sources
            </p>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={22}
            spellCheck={false}
            className="w-full px-4 py-3 font-mono text-sm text-slate-800 focus:outline-none resize-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Analyzing..." : "Reconcile Medications"}
        </button>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results section */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
            <p className="text-lg">Submit records to see reconciliation results</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Running clinical analysis...</p>
          </div>
        )}

        {result && (
          <>
            {/* Reconciled medication */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">
                  Reconciled Medication
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-lg font-semibold text-slate-900">
                  {result.reconciled_medication}
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${confidenceColor(
                      result.confidence_score,
                    )}`}
                  >
                    Confidence: {Math.round(result.confidence_score * 100)}%
                  </span>
                  {safetyBadge(result.clinical_safety_check)}
                </div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Confidence Level
              </h3>
              <div className="w-full bg-slate-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    result.confidence_score >= 0.8
                      ? "bg-emerald-500"
                      : result.confidence_score >= 0.5
                        ? "bg-amber-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${result.confidence_score * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1 text-right">
                {Math.round(result.confidence_score * 100)}%
              </p>
            </div>

            {/* Reasoning */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">
                  Clinical Reasoning
                </h2>
              </div>
              <div className="p-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {result.reasoning}
                </p>
              </div>
            </div>

            {/* Recommended actions */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">
                  Recommended Actions
                </h2>
              </div>
              <ul className="divide-y divide-slate-100">
                {result.recommended_actions.map((action, i) => (
                  <li key={i} className="px-4 py-3 flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 border-slate-300" />
                    <span className="text-sm text-slate-700">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Approve / Reject */}
            {decision === null ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setDecision("approved")}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors"
                >
                  Approve Recommendation
                </button>
                <button
                  onClick={() => setDecision("rejected")}
                  className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
              </div>
            ) : (
              <div
                className={`p-3 rounded-lg text-sm font-medium text-center ${
                  decision === "approved"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
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
