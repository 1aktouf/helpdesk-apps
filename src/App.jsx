import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import NewTicket from './pages/NewTicket'
import MyTickets from './pages/MyTickets'
import Admin from './pages/Admin'
import { useAuth } from './AuthContext'
import './App.css'

function navClass({ isActive }) {
  return isActive ? 'active' : ''
}

function App() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">HelpDesk</div>
        <nav className="app-nav">
          {!user && <NavLink to="/login" className={navClass}>Login</NavLink>}
          {!user && <NavLink to="/register" className={navClass}>Register</NavLink>}
          <NavLink to="/tickets/new" className={navClass}>Submit Ticket</NavLink>
          <NavLink to="/tickets" className={navClass}>My Tickets</NavLink>
          {user && user.role === 'admin' && (
            <NavLink to="/admin" className={navClass}>Admin</NavLink>
          )}
          {!loading && user && (
            <span className="app-user">
              {user.email}
              <button className="link-btn" onClick={handleLogout}>Log out</button>
            </span>
          )}
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tickets/new" element={<NewTicket />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
