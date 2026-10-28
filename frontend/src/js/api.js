/**
 * CivicSamadhan REST API Client
 */

const API_BASE = '/api';

export const apiClient = {
  async request(endpoint, options = {}) {
    const role = window.app?.currentUser?.role || 'citizen';
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': role,
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, config);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error(`[API Error] ${endpoint}:`, error.message);
      throw error;
    }
  },

  // Auth Endpoints
  signup(payload) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  login(payload) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  redeemPerk(payload) {
    return this.request('/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // Issues
  fetchIssues(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/issues${query ? '?' + query : ''}`);
  },

  createIssue(payload) {
    return this.request('/issues', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  assignContractor(issueId, contractorId, slaHours = 24) {
    return this.request(`/issues/${issueId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ contractorId, slaHours })
    });
  },

  submitResolution(issueId, resolvedImageUrl, notes) {
    return this.request(`/issues/${issueId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolvedImageUrl, notes })
    });
  },

  verifyResolution(issueId, feedback = '', satisfied = true) {
    return this.request(`/issues/${issueId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ feedback, satisfied })
    });
  },

  // Reference
  fetchStats() {
    return this.request('/stats');
  },

  fetchContractors() {
    return this.request('/contractors');
  },

  fetchLeaderboard() {
    return this.request('/leaderboard');
  },

  resetDatabase() {
    return this.request('/reset', { method: 'POST' });
  }
};
