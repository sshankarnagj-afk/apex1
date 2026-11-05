import React, { useState } from 'react';
import {
  Settings,
  Server,
  Sliders,
  DollarSign,
  Bot,
  ShieldAlert,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save
} from 'lucide-react';
import { apiService } from '../services/api';
import { AppSettings } from '../types/smartparts';

interface SettingsPageProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onRefreshHealth: () => void;
  backendHealth: { status: string; service: string; mode: string; is_live: boolean } | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings,
  onRefreshHealth,
  backendHealth,
}) => {
  const [apiUrl, setApiUrl] = useState(settings.backendUrl);
  const [demoMode, setDemoMode] = useState(settings.isDemoMode);
  const [maxBudget, setMaxBudget] = useState(settings.maxBudgetUsd);
  const [showBudget, setShowBudget] = useState(settings.showToolBudget);
  const [strictSafety, setStrictSafety] = useState(settings.strictSafetyMode);
  const [isPinging, setIsPinging] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    apiService.setBaseUrl(apiUrl);
    apiService.setDemoMode(demoMode);
    onUpdateSettings({
      backendUrl: apiUrl,
      isDemoMode: demoMode,
      maxBudgetUsd: maxBudget,
      showToolBudget: showBudget,
      strictSafetyMode: strictSafety,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsPinging(true);
    try {
      await onRefreshHealth();
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6 max-w-4xl mx-auto">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-slate-100">SmartParts System & Integration Settings</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure backend API endpoints, tool budget limits, simulation fallback modes, and safety thresholds
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
        >
          {saveSuccess ? <CheckCircle2 className="w-4 h-4 text-slate-950" /> : <Save className="w-4 h-4" />}
          <span>{saveSuccess ? 'Saved!' : 'Save Configuration'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        {/* Section 1: Backend Connection */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Server className="w-4 h-4 text-sky-400" />
              Backend API Target URL
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                backendHealth?.is_live
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {backendHealth?.is_live ? 'CONNECTED (LIVE)' : 'STANDALONE (DEMO)'}
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] text-slate-400">Endpoint Base Path:</label>
            <input
              type="text"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="/api or http://localhost:8000"
              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-500 block">
              Default is relative <code>/api</code> (Express server proxying to Python agent).
            </span>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={isPinging}
            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isPinging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Server className="w-3.5 h-3.5" />}
            <span>Ping Backend /api/health</span>
          </button>
        </div>

        {/* Section 2: Demo Mode Toggle */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              Operational Mode
            </span>
            <span className="text-[10px] text-amber-400">{demoMode ? 'SIMULATION' : 'LIVE AGENT'}</span>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0"
              />
              <span className="font-bold">Force Labelled DEMO Mode</span>
            </label>
            <p className="text-[11px] text-slate-400 font-sans">
              When enabled, responses are clearly marked as DEMO data with simulated latencies for offline judging and evaluation.
            </p>
          </div>
        </div>

        {/* Section 3: Tool Budget Configuration */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              Tool Execution Budget Limit
            </span>
            <span className="text-amber-400 font-bold">${maxBudget.toFixed(3)}</span>
          </div>

          <div className="space-y-2">
            <input
              type="range"
              min="0.010"
              max="0.200"
              step="0.005"
              value={maxBudget}
              onChange={(e) => setMaxBudget(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>$0.010 (Strict)</span>
              <span>$0.050 (Standard)</span>
              <span>$0.200 (Generous)</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 pt-1">
              <input
                type="checkbox"
                checked={showBudget}
                onChange={(e) => setShowBudget(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0"
              />
              <span>Display Tool Budget Gauge in Header</span>
            </label>
          </div>
        </div>

        {/* Section 4: Safety & Hazard Invariants */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 font-mono">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              Deterministic Safety Invariants
            </span>
            <span className="text-emerald-400 text-[10px]">ENFORCED</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={strictSafety}
                onChange={(e) => setStrictSafety(e.target.checked)}
                className="rounded bg-slate-900 border-slate-700 text-amber-400 focus:ring-0"
              />
              <span>Strict High-Voltage Cutoff (&gt;60V DC / &gt;1500W)</span>
            </label>
            <p className="text-[11px] text-slate-400 font-sans">
              Rule 7: Incompatible or unverified parts are NEVER dispatched automatically. Overvoltage triggers mandatory human specialist sign-off.
            </p>
          </div>
        </div>
      </div>

      {/* Application & Architecture Information (Section 11 Requirement) */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2 text-slate-200 font-bold">
          <Info className="w-4 h-4 text-amber-400" />
          <span>System Information & Technology Stack</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
          <div>
            <span className="text-slate-500 block">APPLICATION</span>
            <span className="text-slate-200">SmartParts Desk v1.2</span>
          </div>
          <div>
            <span className="text-slate-500 block">AGENT CONTROLLER</span>
            <span className="text-slate-200">Python 3.10 / ReAct</span>
          </div>
          <div>
            <span className="text-slate-500 block">VALIDATION ENGINE</span>
            <span className="text-slate-200">Deterministic Non-LLM</span>
          </div>
          <div>
            <span className="text-slate-500 block">AI REASONING</span>
            <span className="text-emerald-400 font-bold">Gemini 3.8 Flash</span>
          </div>
        </div>
      </div>
    </div>
  );
};
