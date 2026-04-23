const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("cricpadder.token") || "";
}

async function req(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: "POST", body: JSON.stringify(body) }),
  put: (p, body) => req(p, { method: "PUT", body: JSON.stringify(body) }),
  del: (p) => req(p, { method: "DELETE" }),
  setToken: (t) => t ? localStorage.setItem("cricpadder.token", t) : localStorage.removeItem("cricpadder.token"),
};
