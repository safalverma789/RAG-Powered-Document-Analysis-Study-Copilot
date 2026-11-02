/**
 * API client for the RAG Study Copilot FastAPI backend.
 * Uses direct backend URL (http://127.0.0.1:8000) with fallback to Vite proxy (/api).
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

async function handleResponse(res) {
  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      // Non-JSON error payload
    }
    const error = new Error(errorDetail);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export const api = {
  /**
   * Health check
   */
  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await handleResponse(res);
    } catch (err) {
      // Fallback via proxy
      const res = await fetch('/api/health');
      return await handleResponse(res);
    }
  },

  /**
   * Get all uploaded documents
   */
  async getDocuments() {
    try {
      const res = await fetch(`${API_BASE}/documents`);
      return await handleResponse(res);
    } catch (err) {
      if (err.status) throw err;
      const res = await fetch('/api/documents');
      return await handleResponse(res);
    }
  },

  /**
   * Upload document (PDF or TXT)
   */
  async uploadDocument(file) {
    const formData = new FormData();
    formData.append('file', file);

    const tryFetch = async (baseUrl) => {
      const res = await fetch(`${baseUrl}/upload`, {
        method: 'POST',
        body: formData,
      });
      return await handleResponse(res);
    };

    try {
      return await tryFetch(API_BASE);
    } catch (err) {
      if (err.status) throw err;
      return await tryFetch('/api');
    }
  },

  /**
   * Delete document by ID
   */
  async deleteDocument(docId) {
    const tryFetch = async (baseUrl) => {
      const res = await fetch(`${baseUrl}/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
      });
      return await handleResponse(res);
    };

    try {
      return await tryFetch(API_BASE);
    } catch (err) {
      if (err.status) throw err;
      return await tryFetch('/api');
    }
  },

  /**
   * Ask grounded question
   * @param {{ question: string, docId?: string | null }} params
   */
  async askQuestion({ question, docId }) {
    const body = {
      question,
      doc_id: docId || null,
    };

    const tryFetch = async (baseUrl) => {
      const res = await fetch(`${baseUrl}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await handleResponse(res);
    };

    try {
      return await tryFetch(API_BASE);
    } catch (err) {
      if (err.status) throw err;
      return await tryFetch('/api');
    }
  },

  /**
   * Summarize document (Map-Reduce)
   * @param {{ docId: string, style?: 'short' | 'detailed' }} params
   */
  async summarizeDocument({ docId, style = 'short' }) {
    const tryFetch = async (baseUrl) => {
      const res = await fetch(`${baseUrl}/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId, style }),
      });
      return await handleResponse(res);
    };

    try {
      return await tryFetch(API_BASE);
    } catch (err) {
      if (err.status) throw err;
      return await tryFetch('/api');
    }
  },

  /**
   * Extract Key Points
   * @param {{ docId: string }} params
   */
  async extractKeypoints({ docId }) {
    const tryFetch = async (baseUrl) => {
      const res = await fetch(`${baseUrl}/keypoints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc_id: docId }),
      });
      return await handleResponse(res);
    };

    try {
      return await tryFetch(API_BASE);
    } catch (err) {
      if (err.status) throw err;
      return await tryFetch('/api');
    }
  },

  /**
   * Generate Quiz
   * @param {{ docId: string, numQuestions?: number, difficulty?: 'easy' | 'medium' | 'hard' }} params
   */
  async generateQuiz({ docId, numQuestions = 5, difficulty = 'medium' }) {
    const tryFetch = async (baseUrl) => {
      const res = await fetch(`${baseUrl}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: docId,
          num_questions: numQuestions,
          difficulty,
        }),
      });
      return await handleResponse(res);
    };

    try {
      return await tryFetch(API_BASE);
    } catch (err) {
      if (err.status) throw err;
      return await tryFetch('/api');
    }
  },

  /**
   * Tutor Explanation
   * @param {{ docId: string, topic: string }} params
   */
  async explainTopic({ docId, topic }) {
    const tryFetch = async (baseUrl) => {
      const res = await fetch(`${baseUrl}/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: docId,
          topic,
        }),
      });
      return await handleResponse(res);
    };

    try {
      return await tryFetch(API_BASE);
    } catch (err) {
      if (err.status) throw err;
      return await tryFetch('/api');
    }
  },
};
