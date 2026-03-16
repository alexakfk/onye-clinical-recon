import { useState } from "react";
import { validateDataQuality } from "../api";

const EXAMPLE = {
  demographics: { name: "John Doe", dob: "1955-03-15", gender: "M" },
  medications: ["Metformin 500mg", "Lisinopril 10mg"],
  allergies: [],
  conditions: ["Type 2 Diabetes"],
  vital_signs: { blood_pressure: "340/180", heart_rate: 72 },
  last_updated: "2024-06-15",
};

const DIMENSION_LABELS = {
  completeness: "Completeness",
  accuracy: "Accuracy",
  timeliness: "Timeliness",
  clinical_plausibility: "Clinical Plausibility",
};

function scoreColor(score) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTextColor(score) {
  if (score >= 80) return "text-emerald-700";
  if (score >= 50) return "text-amber-700";
  return "text-red-700";
}

function ringColor(score) {
  if (score >= 80) return "stroke-emerald-500";
  if (score >= 50) return "stroke-amber-500";
  return "stroke-red-500";
}

function severityBadge(severity) {
  const styles = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${
        styles[severity] || styles.low
      }`}
    >
      {severity.toUpperCase()}
    </span>
  );
}

function ScoreRing({ score }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" className="-rotate-90">
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-slate-100"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${ringColor(score)} transition-all duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${scoreTextColor(score)}`}>
          {score}
        </span>
        <span className="text-xs text-slate-400">/ 100</span>
      </div>
    </div>
  );
}

export default function DataQualityPanel() {
  const [input, setInput] = useState(JSON.stringify(EXAMPLE, null, 2));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const parsed = JSON.parse(input);
      const data = await validateDataQuality(parsed);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input */}
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-700">
              Patient Record
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paste a patient record JSON to assess data quality
            </p>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full px-4 py-3 font-mono text-sm text-slate-800 focus:outline-none resize-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Analyzing..." : "Validate Data Quality"}
        </button>
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
            <p className="text-lg">Submit a record to see quality analysis</p>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="inline-block w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="mt-3 text-sm text-slate-500">Evaluating data quality...</p>
          </div>
        )}

        {result && (
          <>
            {/* Overall score */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                Overall Quality Score
              </h2>
              <ScoreRing score={result.overall_score} />
            </div>

            {/* Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-700">
                  Dimension Breakdown
                </h2>
              </div>
              <div className="p-4 space-y-4">
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                  const value = result.breakdown[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600 font-medium">
                          {label}
                        </span>
                        <span className={`font-semibold ${scoreTextColor(value)}`}>
                          {value}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-500 ${scoreColor(
                            value,
                          )}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Issues */}
            {result.issues_detected.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Issues Detected
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      ({result.issues_detected.length})
                    </span>
                  </h2>
                </div>
                <ul className="divide-y divide-slate-100">
                  {result.issues_detected.map((issue, i) => (
                    <li key={i} className="px-4 py-3 space-y-1">
                      <div className="flex items-center gap-2">
                        {severityBadge(issue.severity)}
                        <code className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {issue.field}
                        </code>
                      </div>
                      <p className="text-sm text-slate-700">{issue.issue}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
