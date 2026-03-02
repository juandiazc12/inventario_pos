/**
 * api.js — Cliente HTTP centralizado con JWT automático
 */

const API_BASE = (() => {
    // Si el frontend se sirve desde el mismo backend (ej. http://localhost:3001), usar mismo origen.
    // Si se abre desde Live Server/file://, usar el backend por defecto.
    const origin = window.location.origin;
    if (origin && origin !== 'null') return `${origin}/api`;
    return 'http://localhost:3001/api';
})();

const API = {
    /**
     * Obtiene el token del localStorage
     */
    _getToken() {
        return localStorage.getItem('token');
    },

    /**
     * Construye los headers con JWT
     */
    _headers(extra = {}) {
        const token = this._getToken();
        console.log('Token encontrado:', token ? 'SÍ' : 'NO'); // Debug temporal
        console.log('Endpoint:', API_BASE); // Debug temporal
        if (token) {
            console.log('Token length:', token.length); // Debug temporal
            console.log('Token starts with Bearer:', token.startsWith('eyJ')); // Debug JWT
        }
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...extra
        };
    },

    /**
     * Maneja la respuesta del fetch
     */
    async _handle(response) {
        if (response.status === 401) {
            // Token expirado o inválido
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.Auth) window.Auth.showLogin();
            throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }

        if (response.status === 403) {
            throw new Error('No tienes permisos para realizar esta acción.');
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || `Error ${response.status}`);
        }

        return data;
    },

    async get(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'GET',
            headers: this._headers()
        });
        return this._handle(response);
    },

    async post(endpoint, body) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: this._headers(),
            body: JSON.stringify(body)
        });
        return this._handle(response);
    },

    async put(endpoint, body) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PUT',
            headers: this._headers(),
            body: JSON.stringify(body)
        });
        return this._handle(response);
    },

    async delete(endpoint) {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: this._headers()
        });
        return this._handle(response);
    },

    /**
     * Descarga un archivo (CSV, etc.)
     */
    async download(endpoint, filename) {
        const token = this._getToken();
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al descargar archivo');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.API = API;
