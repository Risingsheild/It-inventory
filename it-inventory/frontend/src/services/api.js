import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  register: (data) => 
    api.post('/auth/register', data),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
  
  updateProfile: (data) => 
    api.put('/auth/me', data),
  
  listUsers: () => 
    api.get('/auth/users'),
  
  updateUser: (userId, data) => 
    api.put(`/auth/users/${userId}`, data),
  
  deleteUser: (userId) => 
    api.delete(`/auth/users/${userId}`),
};

// Assets API
export const assetsAPI = {
  list: (params = {}) => 
    api.get('/assets', { params }),
  
  get: (assetId) => 
    api.get(`/assets/${assetId}`),
  
  create: (data) => 
    api.post('/assets', data),
  
  update: (assetId, data) => 
    api.put(`/assets/${assetId}`, data),
  
  delete: (assetId) => 
    api.delete(`/assets/${assetId}`),
  
  assign: (assetId, employeeId) => 
    api.post(`/assets/${assetId}/assign`, { employee_id: employeeId }),
  
  decommission: (assetId, reason) => 
    api.post(`/assets/${assetId}/decommission`, { reason }),
  
  addRepair: (assetId, data) => 
    api.post(`/assets/${assetId}/repairs`, { ...data, asset_id: assetId }),
  
  getRepairs: (assetId) => 
    api.get(`/assets/${assetId}/repairs`),
  
  markFixed: (assetId) => 
    api.post(`/assets/${assetId}/mark-fixed`),
};

// Employees API
export const employeesAPI = {
  list: (params = {}) => 
    api.get('/employees', { params }),
  
  get: (employeeId) => 
    api.get(`/employees/${employeeId}`),
  
  create: (data) => 
    api.post('/employees', data),
  
  update: (employeeId, data) => 
    api.put(`/employees/${employeeId}`, data),
  
  delete: (employeeId) => 
    api.delete(`/employees/${employeeId}`),
  
  getAssets: (employeeId) => 
    api.get(`/employees/${employeeId}/assets`),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => 
    api.get('/dashboard/stats'),
  
  getWarrantyAlerts: () => 
    api.get('/dashboard/warranty-alerts'),
  
  getRecentRepairs: (limit = 10) => 
    api.get('/dashboard/recent-repairs', { params: { limit } }),
};

// CSV Import/Export API
export const csvAPI = {
  exportAssets: () => 
    api.get('/export/assets', { responseType: 'blob' }),
  
  exportEmployees: () => 
    api.get('/export/employees', { responseType: 'blob' }),
  
  downloadTemplate: () => 
    api.get('/export/asset-template', { responseType: 'blob' }),
  
  importAssets: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/assets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  importEmployees: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import/employees', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;
