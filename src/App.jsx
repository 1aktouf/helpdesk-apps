import { Routes, Route, NavLink } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import NewTicket from './pages/NewTicket'
import MyTickets from './pages/MyTickets'
import Admin from './pages/Admin'
import './App.css'

function navClass({ isActive }) {
  return isActive ? 'active' : ''
}

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">HelpDesk</div>
        <nav className="app-nav">
          <NavLink to="/login" className={navClass}>Login</NavLink>
          <NavLink to="/register" className={navClass}>Register</NavLink>
          <NavLink to="/tickets/new" className={navClass}>Submit Ticket</NavLink>
          <NavLink to="/tickets" className={navClass}>My Tickets</NavLink>
          <NavLink to="/admin" className={navClass}>Admin</NavLink>
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
