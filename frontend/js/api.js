/**
 * Curoa.AI — API client
 * Thin wrapper around fetch() for talking to the backend.
 * Centralizing this here means the rest of the frontend never
 * touches URLs, headers, or token storage directly.
 */

const CuroaAPI = (() => {
  // Change this if the backend runs somewhere else (e.g. in production).
  const BASE_URL = window.CUROA_API_BASE || "http://localhost:8000/api";

  const TOKEN_KEY = "curoa_access_token";
  const USER_KEY = "curoa_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function isLoggedIn() {
    return Boolean(getToken());
  }

  async function request(path, { method = "GET", body, auth = true, params } = {}) {
    let url = `${BASE_URL}${path}`;
    if (params) {
      const qs = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
      ).toString();
      if (qs) url += `?${qs}`;
    }

    const headers = { "Content-Type": "application/json" };
    if (auth && getToken()) {
      headers["Authorization"] = `Bearer ${getToken()}`;
    }

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      // Backend not reachable yet (expected while only the frontend exists).
      throw new APIError(
        "Curoa.AI's servers can't be reached right now. Please try again shortly.",
        0,
        networkErr
      );
    }

    let data = null;
    const text = await response.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = { detail: text }; }
    }

    if (!response.ok) {
      const message = (data && (data.detail || data.message)) || `Request failed (${response.status})`;
      throw new APIError(message, response.status, data);
    }

    return data;
  }

  class APIError extends Error {
    constructor(message, status, payload) {
      super(message);
      this.status = status;
      this.payload = payload;
    }
  }

  return {
    // ---- Auth ----
    signup: (payload) => request("/auth/signup", { method: "POST", body: payload, auth: false }),
    login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
    logout: () => request("/auth/logout", { method: "POST" }).catch(() => null),

    // ---- Users ----
    getProfile: () => request("/users/me"),
    updateProfile: (payload) => request("/users/me", { method: "PUT", body: payload }),

    // ---- Conversations & messages ----
    listConversations: () => request("/conversations"),
    createConversation: (payload) => request("/conversations", { method: "POST", body: payload }),
    getConversation: (id) => request(`/conversations/${id}`),
    deleteConversation: (id) => request(`/conversations/${id}`, { method: "DELETE" }),
    listMessages: (conversationId) => request(`/conversations/${conversationId}/messages`),

    // ---- Chat (placeholder until the medical AI model is connected) ----
    sendChatMessage: (payload) => request("/chat", { method: "POST", body: payload }),

    // ---- Hospitals ----
    listHospitals: (params) => request("/hospitals", { params }),
    getHospital: (id) => request(`/hospitals/${id}`),

    // ---- Session helpers ----
    getToken,
    setSession,
    clearSession,
    getCurrentUser,
    isLoggedIn,
    APIError,
  };
})();
