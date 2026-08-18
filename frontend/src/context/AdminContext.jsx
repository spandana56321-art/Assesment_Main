import { createContext, useContext, useState } from 'react'
import { api } from '../services/api'

const AdminContext = createContext(null)

const TOKEN_KEY = 'admin_token_v1'

export function AdminProvider({ children }) {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  async function login(email, password) {
    const { token } = await api.admin.login({ email, password })
    setAdminToken(token)
    return token
  }

  function logout() {
    api.admin.logout(adminToken)
    setAdminToken(null)
  }

  const isAuthenticated = Boolean(adminToken && api.admin.isValidToken(adminToken))

  return (
    <AdminContext.Provider value={{ adminToken, isAuthenticated, login, logout }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  return useContext(AdminContext)
}