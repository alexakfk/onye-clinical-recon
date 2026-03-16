import { useState } from "react";
import ReconciliationPanel from "./components/ReconciliationPanel";
import DataQualityPanel from "./components/DataQualityPanel";

const TABS = [
  { id: "reconciliation", label: "Medication Reconciliation" },
  { id: "quality", label: "Data Quality" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("reconciliation");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-600 text-white font-bold text-lg">
              R
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                Clinical Data Reconciliation Engine
              </h1>
              <p className="text-sm text-slate-500">
                AI-powered analysis of conflicting clinical records
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex gap-2" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active panel */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "reconciliation" ? (
          <ReconciliationPanel />
        ) : (
          <DataQualityPanel />
        )}
      </main>
    </div>
  );
}
