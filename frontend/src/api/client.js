/**
 * API Client with JWT Interception and Unified Error Extraction
 */

const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const BASE_URL = rawBase.replace(/\/+$/, '');

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('veloop_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new Error(data?.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.code = data?.code || 'UNKNOWN_ERROR';
      error.errors = data?.errors || null;
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// API Services
export const authApi = {
  login: (credentials) =>
    apiClient('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  register: (payload) =>
    apiClient('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  getMe: () => apiClient('/api/auth/me')
};

export const walletApi = {
  getWallet: () => apiClient('/api/wallet'),
  getSummary: () => apiClient('/api/wallet/summary'),
  getTransactions: (params = '') => apiClient(`/api/wallet/transactions${params ? `?${params}` : ''}`),
  adminCredit: (payload) =>
    apiClient('/api/wallet/credit', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  adminDebit: (payload) =>
    apiClient('/api/wallet/debit', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};

export const payoutApi = {
  getMethods: () => apiClient('/api/payout/methods'),
  getOptionsByMethod: (method) => apiClient(`/api/payout/options/${method}`)
};

export const withdrawalApi = {
  create: (payload, idempotencyKey) => {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return apiClient('/api/withdrawals', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
  },
  getWithdrawals: (params = '') => apiClient(`/api/withdrawals${params ? `?${params}` : ''}`),
  getById: (id) => apiClient(`/api/withdrawals/${id}`),
  adminApprove: (id, payload = {}) =>
    apiClient(`/api/withdrawals/${id}/approve`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  adminReject: (id, payload = {}) =>
    apiClient(`/api/withdrawals/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })
};

export const adminApi = {
  getStats: () => apiClient('/api/admin/stats'),
  getUsers: (params = '') => apiClient(`/api/admin/users${params ? `?${params}` : ''}`),
  getUserDetails: (id) => apiClient(`/api/admin/users/${id}`),
  getUserTransactions: (id, params = '') => apiClient(`/api/admin/users/${id}/transactions${params ? `?${params}` : ''}`),
  getUserWithdrawals: (id, params = '') => apiClient(`/api/admin/users/${id}/withdrawals${params ? `?${params}` : ''}`),
  getWithdrawals: (params = '') => apiClient(`/api/admin/withdrawals${params ? `?${params}` : ''}`),
  getWithdrawalDetails: (id) => apiClient(`/api/admin/withdrawals/${id}`),
  getAuditLogs: (params = '') => apiClient(`/api/admin/audit-logs${params ? `?${params}` : ''}`)
};
