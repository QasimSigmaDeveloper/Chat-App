import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AtSign, Eye, EyeOff, LockKeyhole, Mail, MessageCircle, UserRound } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore.js'

const SignupPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({ fullName: '', username: '', email: '', password: '' })
  const { signup, isSigningUp } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (formData.fullName.trim().length < 2) return
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(formData.username.trim())) return
    if (formData.password.length < 6) return
    if (await signup({
      ...formData,
      fullName: formData.fullName.trim(),
      username: formData.username.trim().toLowerCase(),
    })) navigate('/')
  }

  return (
    <main className='auth-page'>
      <div className='auth-card'>
        <div className='auth-heading'>
          <div className='auth-icon'><MessageCircle size={23} /></div>
          <span className='eyebrow'>A better way to stay close</span>
          <h1>Create your account</h1>
          <p>Join your people and pick up the conversation.</p>
        </div>
        <form className='auth-form' onSubmit={handleSubmit}>
          <label className='field-label' htmlFor='fullName'>Full name</label>
          <div className='input-wrap'>
            <UserRound size={18} />
            <input id='fullName' autoComplete='name' placeholder='Your name' required minLength={2}
              value={formData.fullName} onChange={(event) => setFormData({ ...formData, fullName: event.target.value })} />
          </div>
          <label className='field-label' htmlFor='username'>Username</label>
          <div className='input-wrap'>
            <AtSign size={18} />
            <input id='username' autoComplete='username' placeholder='e.g. qasim_123' required minLength={3} maxLength={20}
              pattern='[A-Za-z0-9_]{3,20}' title='Use 3–20 letters, numbers, or underscores.'
              value={formData.username} onChange={(event) => setFormData({ ...formData, username: event.target.value })} />
          </div>
          <p className='username-hint'>Your unique username helps people find the right account.</p>
          <label className='field-label' htmlFor='email'>Email address</label>
          <div className='input-wrap'>
            <Mail size={18} />
            <input id='email' type='email' autoComplete='email' placeholder='you@example.com' required
              value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
          </div>
          <label className='field-label' htmlFor='password'>Password</label>
          <div className='input-wrap'>
            <LockKeyhole size={18} />
            <input id='password' type={showPassword ? 'text' : 'password'} autoComplete='new-password'
              placeholder='At least 6 characters' minLength={6} required
              value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} />
            <button type='button' className='input-trailing' aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button className='primary-button' type='submit' disabled={isSigningUp}>
            {isSigningUp ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className='auth-switch'>Already have an account? <Link to='/login'>Sign in</Link></p>
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

export default SignupPage
