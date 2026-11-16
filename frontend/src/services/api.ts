import { ChatSession, ChatMessage, TaskExecution } from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Sessions
  async listSessions(): Promise<ChatSession[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch chat sessions');
    return res.json();
  },

  async createSession(title?: string): Promise<ChatSession> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'New Chat' })
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async getSession(sessionId: string): Promise<ChatSession & { messages: ChatMessage[] }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Failed to load session');
    return res.json();
  },

  async deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  // Chat message submission
  async sendChatMessage(
    content: string,
    sessionId?: string,
    crawlOptions?: { max_pages: number; depth: number; url?: string }
  ): Promise<{ execution_id: string; session_id: string; status: string }> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        session_id: sessionId,
        crawl_options: crawlOptions || {}
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to send message' }));
      throw new Error(err.detail || 'Failed to send message');
    }
    return res.json();
  },

  // Executions
  async getExecution(executionId: string): Promise<TaskExecution> {
    const res = await fetch(`${API_BASE}/executions/${executionId}`);
    if (!res.ok) throw new Error('Failed to fetch execution details');
    return res.json();
  },

  async listExecutions(limit = 20, status?: string): Promise<TaskExecution[]> {
    const query = new URLSearchParams({ limit: String(limit) });
    if (status) query.append('status', status);
    const res = await fetch(`${API_BASE}/executions?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch execution history');
    return res.json();
  },

  async retryExecution(executionId: string): Promise<{ new_execution_id: string; session_id: string; status: string }> {
    const res = await fetch(`${API_BASE}/executions/${executionId}/retry`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to retry execution');
    return res.json();
  }
};
