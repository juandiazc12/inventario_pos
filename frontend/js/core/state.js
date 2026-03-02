/**
 * state.js — Estado global reactivo simple
 */

const AppState = {
    user: null,
    currentSection: 'dashboard',
    cache: {
        categorias: null,
        productos: null,
        clientes: null,
        proveedores: null
    },
    listeners: {},

    set(key, value) {
        this[key] = value;
        if (this.listeners[key]) {
            this.listeners[key].forEach(cb => cb(value));
        }
    },

    get(key) {
        return this[key];
    },

    subscribe(key, callback) {
        if (!this.listeners[key]) this.listeners[key] = [];
        this.listeners[key].push(callback);
        return () => {
            this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
        };
    },

    clearCache(key) {
        if (key) {
            this.cache[key] = null;
        } else {
            Object.keys(this.cache).forEach(k => this.cache[k] = null);
        }
    }
};

window.AppState = AppState;
