import { Navigate } from 'react-router-dom'
import { useAdmin } from '../context/AdminContext'

export default function AdminRoute({ children }) {
  const { isAuthenticated } = useAdmin()
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />
  return children
}