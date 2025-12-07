// src/services/settingsService.js
import api from './api';

export const settingsService = {
  async updateSettings(userId, settings) {
    return api.user.updateUser ? // reuse if supported
      // 如果后端未支持 updateUser settings, call dedicated endpoint
      fetch(`${import.meta.env.VITE_USER_API_BASE || 'http://localhost:5002'}/api/users/${userId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      }).then(res => res.json())
      : null;
  },

  async getUser(userId) {
    // reuse existing user API if present
    return fetch(`${import.meta.env.VITE_USER_API_BASE || 'http://localhost:5002'}/api/users/${userId}`)
      .then(res => res.json());
  }
};

export default settingsService;