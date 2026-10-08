import { useEffect } from 'react'
import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import Navbar from './components/Navbar.jsx'
import HomePage from './pages/HomePage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SettingPage from './pages/SettingPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { useAuthStore } from './store/useAuthStore.js'

function App() {
  const { authUser, checkAuth, isCheckingAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isCheckingAuth) {
    return (
      <div className='app-loading'>
        <LoaderCircle className='size-8 animate-spin text-blue-400' />
        <span>Connecting to your space...</span>
      </div>
    )
  }

  return (
    <div className='app-shell'>
      <Navbar />
      <Routes>
        <Route path='/' element={authUser ? <HomePage /> : <Navigate to='/login' replace />} />
        <Route path='/signup' element={!authUser ? <SignupPage /> : <Navigate to='/' replace />} />
        <Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to='/' replace />} />
        <Route path='/setting' element={<SettingPage />} />
        <Route path='/profile' element={authUser ? <ProfilePage /> : <Navigate to='/login' replace />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
      <Toaster
        position='top-right'
        toastOptions={{
          style: { background: '#111d32', color: '#e5eefb', border: '1px solid #253651' },
        }}
      />
    </div>
  )
}

export default App
