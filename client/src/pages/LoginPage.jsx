import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail, MessageCircle } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore.js'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ email: '', password: '' })
  const { login, isLoggingIn } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (await login(formData)) navigate('/')
  }

  return (
    <main className='auth-page'>
      <div className='auth-card'>
        <div className='auth-heading'>
          <div className='auth-icon'><MessageCircle size={23} /></div>
          <span className='eyebrow'>Good to have you back</span>
          <h1>Welcome back</h1>
          <p>Sign in to continue where you left off.</p>
        </div>
        <form className='auth-form' onSubmit={handleSubmit}>
          <label className='field-label' htmlFor='email'>Email address</label>
          <div className='input-wrap'>
            <Mail size={18} />
            <input id='email' type='email' autoComplete='email' placeholder='you@example.com' required
              value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
          </div>
          <label className='field-label' htmlFor='password'>Password</label>
          <div className='input-wrap'>
            <LockKeyhole size={18} />
            <input id='password' type={showPassword ? 'text' : 'password'} autoComplete='current-password'
              placeholder='Enter your password' required
              value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} />
            <button type='button' className='input-trailing' aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button className='primary-button' type='submit' disabled={isLoggingIn}>
            {isLoggingIn ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className='auth-switch'>New to Bluechat? <Link to='/signup'>Create an account</Link></p>
        <div className='auth-footnote'><span />Private conversations, thoughtfully designed</div>
      </div>
      <div className='auth-aside'>
        <div className='aside-orb orb-one' /><div className='aside-orb orb-two' />
        <div className='aside-content'>
          <div className='aside-badge'><span className='live-dot' /> YOUR SPACE, YOUR PEOPLE</div>
          <h2>Conversations<br />that feel <span>closer.</span></h2>
          <p>A calm, focused place for the messages that matter. Simple by design, connected in real time.</p>
          <div className='aside-preview'>
            <div className='preview-avatar'>J</div>
            <div><strong>Jamie Parker</strong><p>That sounds like a plan ✨</p></div>
            <span className='preview-time'>now</span>
          </div>
          <div className='aside-caption'><span /> Live conversations <span className='caption-divider'>·</span> Always in sync</div>
        </div>
      </div>
    </main>
  )
}

export default LoginPage
