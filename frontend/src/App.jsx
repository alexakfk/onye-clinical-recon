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
    <div className="min-h-screen bg-md-background relative overflow-hidden">
      {/* Organic blur shapes — teal/coral atmospheric background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-md-primary/10 blur-3xl" />
        <div className="absolute top-1/3 -left-60 w-[500px] h-[500px] rounded-full bg-md-tertiary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-md-secondary-container/30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-md-outline-variant/50 bg-md-surface/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center gap-5">
            <img
              src="/onye-logo.png"
              alt="Onye"
              className="h-9 w-auto"
            />
            <div className="h-8 w-px bg-md-outline-variant/60" aria-hidden="true" />
            <div>
              <h1 className="text-base font-medium text-md-on-surface tracking-tight leading-tight">
              Clinical Data Reconciliation Engine
              </h1>
              <p className="text-xs text-md-on-surface-variant">
                by Alexa Kafka
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab navigation */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <nav className="flex gap-2" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ease-md-standard active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-md-primary focus-visible:ring-offset-2 ${
                activeTab === tab.id
                  ? "bg-md-secondary-container text-md-on-secondary-container shadow-sm"
                  : "text-md-on-surface-variant hover:bg-md-primary/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Active panel */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "reconciliation" ? (
          <ReconciliationPanel />
        ) : (
          <DataQualityPanel />
        )}
      </main>
    </div>
  );
}
