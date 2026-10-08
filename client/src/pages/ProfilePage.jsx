import { useRef, useState } from 'react'
import { AtSign, Camera, Check, Mail, ShieldCheck, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '../components/Avatar.jsx'
import { useAuthStore } from '../store/useAuthStore.js'

const ProfilePage = () => {
  const { authUser, updateProfile, isUpdatingProfile } = useAuthStore()
  const fileRef = useRef(null)
  const [preview, setPreview] = useState('')

  const handleImage = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Images must be smaller than 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPreview(String(reader.result))
    reader.onerror = () => toast.error('Could not read this image file.')
    reader.readAsDataURL(file)
  }

  const savePhoto = async () => {
    if (preview && await updateProfile(preview)) setPreview('')
  }

  return (
    <main className='content-page profile-page'>
      <div className='page-title'>
        <span className='eyebrow'>YOUR ACCOUNT</span>
        <h1>Your profile</h1>
        <p>Make it easy for your people to recognize you.</p>
      </div>
      <section className='profile-card'>
        <div className='profile-cover'><div className='cover-glow' /></div>
        <div className='profile-identity'>
          <div className='profile-avatar-wrap'>
            <Avatar user={{ ...authUser, profilePic: preview || authUser?.profilePic }} />
            <button className='camera-button' onClick={() => fileRef.current?.click()} aria-label='Choose profile photo'><Camera size={16} /></button>
            <input ref={fileRef} type='file' accept='image/*' hidden onChange={handleImage} />
          </div>
          <div className='profile-name'><h2>{authUser?.fullName}</h2><span className='profile-username'>@{authUser?.username || 'username unavailable'}</span><span className='member-tag'><span /> BLUECHAT MEMBER</span></div>
          <span className='profile-active'><Check size={14} /> Account active</span>
        </div>
        <div className='profile-fields'>
          <div className='profile-field'><span className='profile-field-icon'><UserRound size={17} /></span><div><small>FULL NAME</small><strong>{authUser?.fullName}</strong></div></div>
          <div className='profile-field'><span className='profile-field-icon'><AtSign size={17} /></span><div><small>USERNAME</small><strong>{authUser?.username ? `@${authUser.username}` : 'Not set on this account'}</strong></div></div>
          <div className='profile-field'><span className='profile-field-icon'><Mail size={17} /></span><div><small>EMAIL ADDRESS</small><strong>{authUser?.email}</strong></div></div>
          <div className='profile-field'><span className='profile-field-icon'><ShieldCheck size={17} /></span><div><small>ACCOUNT SECURITY</small><strong>Protected session</strong></div></div>
        </div>
        <div className='profile-card-footer'>
          <span>{preview ? 'Looking good — save your new photo.' : 'Your details are only shared with your contacts.'}</span>
          {preview && <button className='primary-button save-profile' disabled={isUpdatingProfile} onClick={savePhoto}>{isUpdatingProfile ? 'Saving…' : 'Save photo'}</button>}
        </div>
      </section>
    </main>
  )
}

export default ProfilePage
