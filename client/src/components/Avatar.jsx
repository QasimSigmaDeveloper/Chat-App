const Avatar = ({ user, size = 'regular' }) => {
  const initials = user?.fullName
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((name) => name[0])
    .join('')
    .toUpperCase() || '?'

  return (
    <div className={`avatar ${size === 'small' ? 'avatar-small' : ''}`}>
      {user?.profilePic
        ? <img src={user.profilePic} alt={`${user.fullName} profile`} />
        : <span>{initials}</span>}
    </div>
  )
}

export default Avatar
