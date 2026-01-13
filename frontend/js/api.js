import CONFIG from "./config.js";
import Utils from "./utils.js";

const cache = new Map();

const API = {
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_BASE_URL}${endpoint}`;

        // 1. Gestion du Cache (Lecture)
        if (options.method === "GET" || !options.method) {
            const cacheKey = url + (options.params ? JSON.stringify(options.params) : "");
            const cached = cache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < CONFIG.CACHE_TTL)) {
                return cached.data;
            }
        }

        const defaultHeaders = {
            "Content-Type": "application/json"
        };

        // 2. INJECTION DU TOKEN (C est ici que la magie opère)
        const token = localStorage.getItem("shadow_token");
        if (token) {
            defaultHeaders["Authorization"] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers
            },
            credentials: "include"
        };

        if (options.params) {
            const query = new URLSearchParams(options.params).toString();
            endpoint = `${endpoint}?${query}`;
        }

        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, config);
            
            // Gestion spéciale pour l erreur 401 (Token expiré)
            if (response.status === 401) {
                localStorage.removeItem("shadow_token");
                window.location.reload(); // Renvoie au login
                throw new Error("Session expired");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "API Request failed");
            }

            // Gestion du Cache (Ecriture)
            if (options.method === "GET" || !options.method) {
                const cacheKey = `${CONFIG.API_BASE_URL}${endpoint}`;
                cache.set(cacheKey, { data, timestamp: Date.now() });
            }

            return data;
        } catch (error) {
            console.error("API Error:", error);
            Utils.showToast(error.message, "error");
            throw error;
        }
    },

    async login(pin) {
        // On appelle le login
        const data = await this.request("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({ pin })
        });
        
        // 3. SAUVEGARDE DU TOKEN (Important !)
        // Le backend peut renvoyer "access_token" ou juste "token"
        const token = data.access_token || data.token;
        if (token) {
            localStorage.setItem("shadow_token", token);
        }
        return data;
    },

    async logout() {
        localStorage.removeItem("shadow_token"); // On détruit le badge
        return this.request("/api/auth/logout", { method: "POST" });
    },

    async getSummary(params) {
        return this.request("/api/summary", { params });
    },

    async getLocations() {
        return this.request("/api/locations");
    },

    async getBarData(slug, params) {
        return this.request(`/api/bar/${slug}`, { params });
    },

    async compare(params) {
        return this.request("/api/compare", { params });
    },

    async compareYoY(params) {
        return this.request("/api/compare/yoy", { params });
    },

    async importData(formData) {
        const token = localStorage.getItem("shadow_token");
        const headers = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        return fetch(`${CONFIG.API_BASE_URL}/api/admin/import`, {
            method: "POST",
            body: formData,
            headers: headers,
            credentials: "include"
        }).then(res => res.json());
    }
};

export default API;
