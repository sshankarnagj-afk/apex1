import React, { useState, useEffect } from 'react';
import {
  Wrench,
  Bot,
  Layers,
  Package,
  TrendingUp,
  Terminal,
  Settings,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check
} from 'lucide-react';
import JSZip from 'jszip';
import { apiService } from './services/api';
import {
  Part,
  WorkshopRequest,
  AnalyticsData,
  AppSettings
} from './types/smartparts';

import { OverviewDashboard } from './components/OverviewDashboard';
import { SmartPartsChatbot } from './components/SmartPartsChatbot';
import { AgentWorkflowVisualizer } from './components/AgentWorkflowVisualizer';
import { InventoryCatalogue } from './components/InventoryCatalogue';
import { RequestManager } from './components/RequestManager';
import { LiveBatchProcessor } from './components/LiveBatchProcessor';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { SettingsPage } from './components/SettingsPage';
import { HackathonTourModal } from './components/HackathonTourModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'requests' | 'catalogue' | 'batch' | 'analytics' | 'codebase' | 'settings'>('dashboard');
  const [catalogue, setCatalogue] = useState<Part[]>([]);
  const [requests, setRequests] = useState<WorkshopRequest[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<WorkshopRequest | null>(null);
  const [backendHealth, setBackendHealth] = useState<{ status: string; service: string; mode: string; is_live: boolean } | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    backendUrl: '/api',
    isDemoMode: false,
    maxBudgetUsd: 0.050,
    temperature: 0.2,
    autoOpenChatbot: false,
    showToolBudget: true,
    strictSafetyMode: true,
  });

  // Codebase Explorer
  const [pythonFiles, setPythonFiles] = useState<Record<string, string>>({});
  const [selectedPyFile, setSelectedPyFile] = useState<string>('agent/controller.py');
  const [copiedCode, setCopiedCode] = useState(false);

  // Refresh all state
  const loadAllData = async () => {
    try {
      const [health, parts, reqs, anlt, pyFilesRes] = await Promise.all([
        apiService.checkHealth(),
        apiService.getInventory(),
        apiService.getRequests(),
        apiService.getAnalytics(),
        fetch('/api/python-files').then(r => r.json()).catch(() => ({ files: {} })),
      ]);

      setBackendHealth(health);
      setCatalogue(parts);
      setRequests(reqs);
      setAnalytics(anlt);
      if (pyFilesRes.files) {
        setPythonFiles(pyFilesRes.files);
      }
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Update Stock
  const handleUpdateStock = async (partId: string, currentStock: number, delta: number) => {
    const newQty = Math.max(0, currentStock + delta);
    try {
      await fetch('/api/catalogue/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ part_id: partId, quantity: newQty }),
      });
      loadAllData();
    } catch (e) {
      console.error('Failed to update stock:', e);
    }
  };

  // Submit New Request from RequestManager
  const handleSubmitNewRequest = async (requestText: string) => {
    setIsLoading(true);
    try {
      const newReq = await apiService.submitRequest(requestText, settings.maxBudgetUsd);
      setRequests(prev => [newReq, ...prev]);
      setSelectedRequest(newReq);
      // Reload analytics & catalogue
      loadAllData();
    } catch (err: any) {
      alert(`Request submission failed: ${err.message || 'Server error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Download Python ZIP
  const handleDownloadZip = async () => {
    const zip = new JSZip();
    const folder = zip.folder('smartparts_agentic_workshop_desk');
    for (const [filePath, content] of Object.entries(pythonFiles)) {
      folder?.file(filePath, content);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartparts_agentic_workshop_desk.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* --- TOP BAR (Strict 3-Zone Contract) --- */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-bold shadow-sm">
            <Wrench className="w-4 h-4 text-slate-950" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            SmartParts – Agentic AI Workshop Parts Desk
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-slate-400">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 cursor-pointer ${
              activeTab === 'dashboard' ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-1' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 cursor-pointer ${
              activeTab === 'requests' ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-1' : ''
            }`}
          >
            Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 cursor-pointer ${
              activeTab === 'catalogue' ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-1' : ''
            }`}
          >
            Catalogue ({catalogue.length})
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 cursor-pointer ${
              activeTab === 'batch' ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-1' : ''
            }`}
          >
            Live Batch Engine
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 cursor-pointer ${
              activeTab === 'analytics' ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-1' : ''
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('codebase')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 cursor-pointer ${
              activeTab === 'codebase' ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-1' : ''
            }`}
          >
            Python Architecture
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-slate-100 cursor-pointer ${
              activeTab === 'settings' ? 'text-amber-400 font-semibold border-b-2 border-amber-400 pb-1' : ''
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {settings.showToolBudget && (
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
              <span>Budget Cap</span>
              <span className="text-amber-400 font-bold">${settings.maxBudgetUsd.toFixed(3)}</span>
            </div>
          )}
          <button
            onClick={() => setIsTourOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-current" />
            <span>Judge Presentation Tour</span>
          </button>
        </div>
      </header>

      {/* Mobile Nav Tabs Bar */}
      <div className="lg:hidden flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800 overflow-x-auto text-xs font-mono no-scrollbar">
        {(['dashboard', 'requests', 'catalogue', 'batch', 'analytics', 'codebase', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2.5 py-1 rounded capitalize whitespace-nowrap ${
              activeTab === tab ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">

        {/* 1. OVERVIEW DASHBOARD */}
        {activeTab === 'dashboard' && (
          <OverviewDashboard
            analytics={analytics}
            recentRequests={requests}
            catalogue={catalogue}
            onSelectRequest={(req) => {
              setSelectedRequest(req);
              setActiveTab('requests');
            }}
            onNavigateTab={setActiveTab}
            isDemoMode={settings.isDemoMode || !backendHealth?.is_live}
          />
        )}

        {/* 2. REQUEST MANAGEMENT & WORKFLOW VISUALIZER */}
        {activeTab === 'requests' && (
          <RequestManager
            requests={requests}
            onSubmitNewRequest={handleSubmitNewRequest}
            selectedRequest={selectedRequest}
            onSelectRequest={setSelectedRequest}
            isLoading={isLoading}
          />
        )}

        {/* 3. INVENTORY & CATALOGUE */}
        {activeTab === 'catalogue' && (
          <InventoryCatalogue
            parts={catalogue}
            onUpdateStock={handleUpdateStock}
            onSelectPartForTest={(part) => {
              // Open chatbot with preloaded prompt
            }}
          />
        )}

        {/* 4. LIVE BATCH ENGINE */}
        {activeTab === 'batch' && (
          <LiveBatchProcessor onRefreshAllData={loadAllData} />
        )}

        {/* 5. ANALYTICS */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard analytics={analytics} catalogue={catalogue} />
        )}

        {/* 6. PYTHON ARCHITECTURE & CODEBASE HUB */}
        {activeTab === 'codebase' && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-slate-100">Standalone Python Backend & Competition Agent Hub</h2>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Modular FastAPI controller, deterministic validator, budget ledger, Pytest suite, and Streamlit app
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const code = pythonFiles[selectedPyFile] || '';
                    navigator.clipboard.writeText(code);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy File'}</span>
                </button>
                <button
                  onClick={handleDownloadZip}
                  className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs font-mono rounded flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export ZIP (.zip)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* File Tree List */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 flex flex-col gap-1 max-h-[600px] overflow-y-auto font-mono text-xs">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 px-2">Modular Python Files</span>
                {Object.keys(pythonFiles).sort().map((fPath) => (
                  <button
                    key={fPath}
                    onClick={() => setSelectedPyFile(fPath)}
                    className={`text-left px-2.5 py-1.5 rounded transition truncate cursor-pointer ${
                      selectedPyFile === fPath ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    {fPath}
                  </button>
                ))}
              </div>

              {/* Code Viewer */}
              <div className="md:col-span-3 bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-2 max-h-[600px] overflow-hidden">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                  <span>File: <span className="text-amber-400">{selectedPyFile}</span></span>
                  <span>{pythonFiles[selectedPyFile]?.split('\n').length || 0} lines</span>
                </div>
                <div className="flex-1 overflow-auto text-xs font-mono text-slate-300">
                  <pre className="p-2 whitespace-pre-wrap leading-relaxed">
                    {pythonFiles[selectedPyFile] || '# Select a file from the explorer on the left'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsPage
            settings={settings}
            onUpdateSettings={(newVals) => setSettings(prev => ({ ...prev, ...newVals }))}
            onRefreshHealth={loadAllData}
            backendHealth={backendHealth}
          />
        )}

      </main>

      {/* Floating High-Priority SmartParts AI Chatbot */}
      <SmartPartsChatbot
        onSelectPart={(part) => {
          setActiveTab('catalogue');
        }}
      />

      {/* Hackathon Guided Presentation Tour Modal */}
      <HackathonTourModal
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigateTab={setActiveTab}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        SmartParts – Agentic AI Workshop Parts Desk · Deterministic Invariant Enforcement Engine · Budget Tracking & Uncertainty Audit
      </footer>
    </div>
  );
}
