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

function barColor(score) {
  if (score >= 80) return "bg-md-success";
  if (score >= 50) return "bg-md-warning";
  return "bg-md-error";
}

function textColor(score) {
  if (score >= 80) return "text-md-success";
  if (score >= 50) return "text-md-warning";
  return "text-md-error";
}

function strokeClass(score) {
  if (score >= 80) return "stroke-[#386A20]";
  if (score >= 50) return "stroke-[#7D5700]";
  return "stroke-[#B3261E]";
}

function glowClass(score) {
  if (score >= 80) return "bg-md-success";
  if (score >= 50) return "bg-md-warning";
  return "bg-md-error";
}

function SeverityBadge({ severity }) {
  const styles = {
    high: "bg-md-error-container text-md-on-error-container",
    medium: "bg-md-warning-container text-md-on-warning-container",
    low: "bg-md-secondary-container text-md-on-secondary-container",
  };
  return (
    <span
      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
        styles[severity] || styles.low
      }`}
    >
      {severity.toUpperCase()}
    </span>
  );
}

function ScoreRing({ score }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Ambient glow — reveals the score's status color */}
      <div
        className={`absolute w-24 h-24 rounded-full blur-2xl opacity-30 ${glowClass(score)}`}
      />
      <svg width="160" height="160" className="-rotate-90">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          className="text-md-surface-variant"
        />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${strokeClass(score)} transition-all duration-700 ease-md-standard`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${textColor(score)}`}>
          {score}
        </span>
        <span className="text-xs text-md-on-surface-variant font-medium">
          / 100
        </span>
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
      {/* ── Input ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="bg-md-surface-container rounded-md-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-base font-medium text-md-on-surface">
              Patient Record
            </h2>
            <p className="text-sm text-md-on-surface-variant mt-0.5">
              Paste a patient record JSON to assess data quality
            </p>
          </div>
          <div className="px-4 pb-4">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={18}
              spellCheck={false}
              className="w-full px-4 py-3 font-mono text-sm text-md-on-surface bg-md-surface-variant rounded-t-md-md border-b-2 border-md-outline focus:border-md-primary focus:outline-none resize-none transition-colors duration-200 placeholder:text-md-on-surface-variant/50"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 rounded-full bg-md-primary text-md-on-primary font-medium text-sm tracking-wide hover:bg-md-primary/90 active:scale-95 active:bg-md-primary/80 disabled:opacity-50 disabled:active:scale-100 transition-all duration-300 ease-md-standard shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2"
        >
          {loading ? "Analyzing" : "Validate Data Quality"}
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
              Submit a record to see quality analysis
            </p>
          </div>
        )}

        {loading && (
          <div className="bg-md-surface-container rounded-md-xl shadow-sm p-10 text-center">
            <div className="inline-block w-10 h-10 border-4 border-md-secondary-container border-t-md-primary rounded-full animate-spin" />
            <p className="mt-4 text-sm text-md-on-surface-variant">
              Evaluating data quality
            </p>
          </div>
        )}

        {result && (
          <>
            {/* Overall score with ambient glow ring */}
            <div className="bg-md-surface-container rounded-md-xl shadow-sm p-8 flex flex-col items-center">
              <h2 className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wider mb-6">
                Overall Quality Score
              </h2>
              <ScoreRing score={result.overall_score} />
            </div>

            {/* Dimension breakdown */}
            <div className="bg-md-surface-container rounded-md-xl shadow-sm overflow-hidden">
              <div className="p-6 pb-2">
                <h2 className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wider">
                  Dimension Breakdown
                </h2>
              </div>
              <div className="px-6 pb-6 space-y-5">
                {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                  const value = result.breakdown[key];
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-md-on-surface font-medium">
                          {label}
                        </span>
                        <span className={`font-bold ${textColor(value)}`}>
                          {value}
                        </span>
                      </div>
                      <div className="w-full bg-md-surface-variant rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full transition-all duration-700 ease-md-standard ${barColor(value)}`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Issues list */}
            {result.issues_detected.length > 0 && (
              <div className="bg-md-surface-container rounded-md-xl shadow-sm overflow-hidden">
                <div className="p-6 pb-2">
                  <h2 className="text-xs font-medium text-md-on-surface-variant uppercase tracking-wider">
                    Issues Detected
                    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-md-error-container text-md-on-error-container text-[10px] font-bold align-middle">
                      {result.issues_detected.length}
                    </span>
                  </h2>
                </div>
                <ul className="px-4 pb-4 space-y-1">
                  {result.issues_detected.map((issue, i) => (
                    <li
                      key={i}
                      className="px-4 py-3 rounded-md-lg hover:bg-md-primary/5 transition-colors duration-200 space-y-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={issue.severity} />
                        <code className="text-xs text-md-on-surface-variant bg-md-surface-variant px-2 py-0.5 rounded-full font-medium">
                          {issue.field}
                        </code>
                      </div>
                      <p className="text-sm text-md-on-surface">
                        {issue.issue}
                      </p>
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
