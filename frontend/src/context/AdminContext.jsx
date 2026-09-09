import { createContext, useContext, useState } from "react";
import { api } from "../services/api";

const AdminContext = createContext(null);
const TOKEN_KEY = "admin_token_v1";
const USER_KEY = "admin_user_v1";

export function AdminProvider({ children }) {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [adminUser, setAdminUser] = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; } });

  async function login(email, password) {
    const data = await api.admin.login({ email, password });
    setAdminToken(data.token);
    setAdminUser(data.admin || null);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.admin || null));
    return data.token;
  }

  function logout() {
    api.admin.logout(adminToken);
    setAdminToken(null);
    setAdminUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  const isAuthenticated = Boolean(adminToken && api.admin.isValidToken(adminToken));
  return <AdminContext.Provider value={{ adminToken, adminUser, isAuthenticated, login, logout }}>{children}</AdminContext.Provider>;
}

export function useAdmin() { return useContext(AdminContext); }
