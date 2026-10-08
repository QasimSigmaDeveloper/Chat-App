import { Link, NavLink } from 'react-router-dom'
import { LogOut, MessageCircle, Settings, UserRound } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore.js'

const Navbar = () => {
  const { authUser, logout } = useAuthStore()

  return (
    <header className='topbar'>
      <Link className='brand' to='/'>
        <span className='brand-mark'><MessageCircle size={19} /></span>
        <span>blue<span className='brand-accent'>chat</span></span>
      </Link>
      <nav className='topbar-actions'>
        <NavLink className='nav-action' to='/setting'><Settings size={17} /><span>Settings</span></NavLink>
        {authUser && (
          <>
            <NavLink className='nav-action' to='/profile'><UserRound size={17} /><span>Profile</span></NavLink>
            <button className='nav-action nav-logout' onClick={logout}><LogOut size={17} /><span>Log out</span></button>
          </>
        )}
      </nav>
    </header>
  )
}

export default Navbar
