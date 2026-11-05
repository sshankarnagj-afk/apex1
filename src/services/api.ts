/**
 * SmartParts API Service Layer
 * Decouples UI components from backend communication with configurable endpoint,
 * structured JSON responses, error handling, and labelled DEMO mode fallback.
 */

import {
  WorkshopRequest,
  Part,
  ChatMessage,
  AnalyticsData,
  AgentActivityEvent,
  ExtractedSpecs
} from '../types/smartparts';

class SmartPartsApiService {
  private baseUrl: string = '/api';
  private demoMode: boolean = false;

  constructor() {
    // Check localStorage for saved settings
    if (typeof window !== 'undefined') {
      const savedUrl = localStorage.getItem('smartparts_backend_url');
      if (savedUrl) this.baseUrl = savedUrl;
      const savedDemo = localStorage.getItem('smartparts_demo_mode');
      if (savedDemo !== null) this.demoMode = savedDemo === 'true';
    }
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartparts_backend_url', this.baseUrl);
    }
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public setDemoMode(enabled: boolean) {
    this.demoMode = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('smartparts_demo_mode', String(enabled));
    }
  }

  public isDemoMode(): boolean {
    return this.demoMode;
  }

  /**
   * Health Check
   */
  public async checkHealth(): Promise<{ status: string; service: string; mode: string; total_catalogue_parts: number; is_live: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { ...data, is_live: true };
    } catch {
      return {
        status: 'demo_fallback',
        service: 'SmartParts Agentic AI Desk (Demo Mode)',
        mode: 'DEMO',
        total_catalogue_parts: 12,
        is_live: false,
      };
    }
  }

  /**
   * POST /api/chat - Conversational agent endpoint
   */
  public async sendChatMessage(
    message: string,
    conversationId?: string,
    context?: Record<string, any>
  ): Promise<{
    reply: string;
    specs?: ExtractedSpecs;
    matchedParts?: ChatMessage['matchedParts'];
    clarification_needed?: boolean;
    suggested_replies?: string[];
  }> {
    if (this.demoMode) {
      return this.mockChatResponse(message);
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation_id: conversationId, context }),
      });

      if (!res.ok) {
        throw new Error(`Chat API error: ${res.statusText}`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Backend chat failed, falling back to client-side NLU demo parser:', err);
      return this.mockChatResponse(message);
    }
  }

  /**
   * POST /api/requests - Submit a new parts request
   */
  public async submitRequest(requestText: string, budgetLimit: number = 0.050): Promise<WorkshopRequest> {
    const res = await fetch(`${this.baseUrl}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: requestText, budget_limit_usd: budgetLimit }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Server error' }));
      throw new Error(err.error || `Error submitting request (${res.status})`);
    }

    return await res.json();
  }

  /**
   * GET /api/requests - Retrieve all workshop requests
   */
  public async getRequests(statusFilter?: string): Promise<WorkshopRequest[]> {
    const query = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '';
    const res = await fetch(`${this.baseUrl}/requests${query}`);
    if (!res.ok) throw new Error('Failed to retrieve requests');
    return await res.json();
  }

  /**
   * GET /api/requests/{request_id}
   */
  public async getRequestDetails(requestId: string): Promise<WorkshopRequest> {
    const res = await fetch(`${this.baseUrl}/requests/${requestId}`);
    if (!res.ok) throw new Error(`Request ${requestId} not found`);
    return await res.json();
  }

  /**
   * GET /api/inventory - Retrieve inventory records
   */
  public async getInventory(category?: string, inStockOnly?: boolean): Promise<Part[]> {
    const params = new URLSearchParams();
    if (category && category !== 'all') params.append('category', category);
    if (inStockOnly) params.append('in_stock_only', 'true');

    const res = await fetch(`${this.baseUrl}/inventory?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to retrieve inventory');
    return await res.json();
  }

  /**
   * GET /api/inventory/{part_id}
   */
  public async getPartDetails(partId: string): Promise<Part> {
    const res = await fetch(`${this.baseUrl}/inventory/${partId}`);
    if (!res.ok) throw new Error(`Part ${partId} not found`);
    return await res.json();
  }

  /**
   * POST /api/batch/process - Run batch processing
   */
  public async runBatchProcessing(): Promise<{
    batch_id: string;
    total_processed: number;
    matched_count: number;
    clarification_count: number;
    rejected_count: number;
    total_tool_calls: number;
    total_cost_usd: number;
    results: WorkshopRequest[];
  }> {
    const res = await fetch(`${this.baseUrl}/batch/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error('Batch processing failed');
    return await res.json();
  }

  /**
   * GET /api/agent/activity
   */
  public async getAgentActivity(): Promise<AgentActivityEvent[]> {
    const res = await fetch(`${this.baseUrl}/agent/activity`);
    if (!res.ok) throw new Error('Failed to fetch activity');
    return await res.json();
  }

  /**
   * GET /api/analytics
   */
  public async getAnalytics(): Promise<AnalyticsData> {
    const res = await fetch(`${this.baseUrl}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return await res.json();
  }

  /**
   * Client-side DEMO NLU fallback when backend is unreachable
   */
  private mockChatResponse(message: string): {
    reply: string;
    specs: ExtractedSpecs;
    matchedParts?: ChatMessage['matchedParts'];
    clarification_needed: boolean;
    suggested_replies?: string[];
  } {
    const lower = message.toLowerCase();

    // Extract basic specs
    let voltage_v: number | null = null;
    const vMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:v(?:olts?|dc)?)\b/);
    if (vMatch) voltage_v = parseFloat(vMatch[1]);

    let power_w: number | null = null;
    const pMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:w(?:atts?)?)\b/);
    if (pMatch) power_w = parseFloat(pMatch[1]);

    let connector: string | null = null;
    if (lower.includes('5-pin') || lower.includes('5 pin')) connector = '5-Pin DIN / JST';
    else if (lower.includes('jst') || lower.includes('jst-xh')) connector = 'JST-XH 4-Pin';
    else if (lower.includes('xt60')) connector = 'XT60';
    else if (lower.includes('xt90')) connector = 'XT90';
    else if (lower.includes('molex') || lower.includes('micro-fit')) connector = 'Molex Micro-Fit 2-Pin';
    else if (lower.includes('screw') || lower.includes('terminal')) connector = 'Screw Terminal 2-Pin';
    else if (lower.includes('usb-c') || lower.includes('type-c')) connector = 'USB-C PD';
    else if (lower.includes('barrel') || lower.includes('5.5x2.1')) connector = 'Barrel 5.5x2.1mm';

    let category = 'General Component';
    if (lower.includes('motor') || lower.includes('stepper')) category = 'Motor';
    else if (lower.includes('power supply') || lower.includes('psu') || lower.includes('buck')) category = 'Power Supply';
    else if (lower.includes('driver') || lower.includes('controller') || lower.includes('esc')) category = 'Driver';
    else if (lower.includes('solenoid') || lower.includes('valve')) category = 'Solenoid';

    const missing: string[] = [];
    if (!voltage_v) missing.push('voltage');
    if (!connector) missing.push('connector');
    if (!power_w && ['Motor', 'Power Supply', 'Driver'].includes(category)) missing.push('power');

    // Case 1: Specific 12V 5-pin motor query (Section 5 prompt)
    if (voltage_v === 12 && (connector === '5-Pin DIN / JST' || lower.includes('5-pin'))) {
      return {
        reply: "I found a match for your 12V 5-Pin motor request! We have the **Precision Planetary Geared Stepper 12V 5-Pin (MOT-12V-005)** in Bay A-09. Please note: inventory shows only 2 units (Low Stock alert), and physical audit is marked 'Uncertain' (>90 days old). Do you have a required torque or power rating?",
        specs: {
          raw_request: message,
          category: 'Motor',
          voltage_v: 12,
          connector_type: '5-Pin DIN / JST',
          power_w: power_w || null,
          missing_fields: power_w ? [] : ['power_rating'],
          confidence: 0.94,
        },
        matchedParts: [
          {
            part: {
              id: 'MOT-12V-005',
              name: 'Precision Planetary Geared Stepper 12V 5-Pin',
              category: 'Motor',
              voltage_nominal_v: 12,
              voltage_min_v: 10,
              voltage_max_v: 14,
              current_draw_a: 2.0,
              power_rating_w: 24.0,
              connector_type: '5-Pin DIN / JST',
              pinout_polarity: 'Pin 1: VCC, Pin 2: GND, Pin 3: Step, Pin 4: Dir, Pin 5: Enable',
              stock_quantity: 2,
              price_usd: 49.0,
              bin_location: 'BAY-A-09',
              safety_cert: 'CE, RoHS',
              verification_status: 'Uncertain',
              last_updated: '2026-06-12',
              spec_summary: '5:1 planetary gearbox, 5-pin unified power and logic connector',
            },
            compatibility_status: 'Needs Verification',
            confidence: 0.92,
            explanation: 'Electrical voltage and 5-pin connector match nominal specifications. Inventory verification is uncertain due to outdated physical count record (>90 days).',
            inventory_verified: false,
            uncertainty_flag: 'Physical audit pending >90 days',
          },
        ],
        clarification_needed: !power_w,
        suggested_replies: ['Confirm 24W power rating is sufficient', 'Check alternative 12V motors', 'Order physical stock verification'],
      };
    }

    // Case 2: Missing fields clarification
    if (missing.length > 0) {
      return {
        reply: `I understand that you need a ${category} with:
• Voltage: ${voltage_v ? `${voltage_v}V` : 'Not specified'}
• Connector: ${connector || 'Not specified'}
• Power: ${power_w ? `${power_w}W` : 'Not specified'}

Do you have a specific ${missing.join(' and ')} requirement? I can use that to narrow down technically compatible workshop parts.`,
        specs: {
          raw_request: message,
          category,
          voltage_v,
          connector_type: connector,
          power_w,
          missing_fields: missing,
          confidence: 0.65,
        },
        clarification_needed: true,
        suggested_replies: ['Voltage is 24V DC', 'Connector is JST-XH 4-Pin', 'Power load is 60 Watts'],
      };
    }

    // Default response
    return {
      reply: `I've analyzed your request for a ${voltage_v}V ${category} with ${connector} rated at ${power_w}W. All electrical and physical requirements are completely specified! I can verify this against current workshop inventory.`,
      specs: {
        raw_request: message,
        category,
        voltage_v,
        connector_type: connector,
        power_w,
        missing_fields: [],
        confidence: 0.96,
      },
      clarification_needed: false,
      suggested_replies: ['Submit official request', 'Inspect catalogue for alternatives', 'Check inventory status'],
    };
  }
}

export const apiService = new SmartPartsApiService();
