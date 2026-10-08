import { Fragment, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Bell, BellRing, Check, Clock3, ImagePlus, LoaderCircle, MessageCircle, Mic, MoreHorizontal, Search, Send, Smile,
  Square, UserPlus, Users, X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Avatar from '../components/Avatar.jsx'
import { useAuthStore } from '../store/useAuthStore.js'
import { useChatStore } from '../store/useChatStore.js'

const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const HomePage = () => {
  const [activeTab, setActiveTab] = useState('chats')
  const [search, setSearch] = useState('')
  const [text, setText] = useState('')
  const [image, setImage] = useState('')
  const [imageName, setImageName] = useState('')
  const [recordedAudio, setRecordedAudio] = useState('')
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isProcessingAudio, setIsProcessingAudio] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported')
  const bottomRef = useRef(null)
  const baseTitleRef = useRef(typeof document !== 'undefined' ? document.title : '')
  const fileRef = useRef(null)
  const recorderRef = useRef(null)
  const recordingStreamRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingStartedAtRef = useRef(0)
  const recordingIntervalRef = useRef(null)
  const recordingTimeoutRef = useRef(null)
  const cancelRecordingRef = useRef(false)
  const { authUser, onlineUsers, socket } = useAuthStore()
  const {
    contacts, people, friendRequests, messages, selectedUser, sendingRequestIds, unreadCounts,
    isContactsLoading, isPeopleLoading, isRequestsLoading, isMessagesLoading, isSendingMessage,
    getContacts, getFriendRequests, searchPeople, sendFriendRequest, respondToFriendRequest,
    getMessages, setSelectedUser, markConversationRead, sendMessage, subscribeToMessages,
  } = useChatStore()
  const unreadTotal = Object.values(unreadCounts).reduce((total, count) => total + count, 0)

  useEffect(() => {
    getContacts()
    getFriendRequests()
  }, [getContacts, getFriendRequests])
  useEffect(() => subscribeToMessages(), [socket, subscribeToMessages])
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedUser) {
        markConversationRead(selectedUser._id)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [selectedUser, markConversationRead])
  useEffect(() => {
    const originalTitle = baseTitleRef.current
    document.title = unreadTotal ? `(${unreadTotal}) ${originalTitle}` : originalTitle
    return () => { document.title = originalTitle }
  }, [unreadTotal])
  useEffect(() => {
    if (!socket) return undefined
    const refreshFriendData = () => {
      getContacts()
      getFriendRequests()
      if (useChatStore.getState().peopleSearch) {
        searchPeople(useChatStore.getState().peopleSearch)
      }
    }
    socket.on('friendRequestUpdated', refreshFriendData)
    return () => socket.off('friendRequestUpdated', refreshFriendData)
  }, [socket, getContacts, getFriendRequests, searchPeople])
  useEffect(() => {
    if (activeTab !== 'people') return undefined
    const timeout = window.setTimeout(() => searchPeople(search), 250)
    return () => window.clearTimeout(timeout)
  }, [activeTab, search, searchPeople])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => () => {
    window.clearInterval(recordingIntervalRef.current)
    window.clearTimeout(recordingTimeoutRef.current)
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
  }, [audioPreviewUrl])

  const isOnline = (userId) => onlineUsers.some((onlineId) => String(onlineId) === String(userId))
  const onlineContactsCount = contacts.filter((user) => isOnline(user._id)).length
  const sortedContacts = [...contacts].sort((first, second) => {
    const onlineOrder = Number(isOnline(second._id)) - Number(isOnline(first._id))
    return onlineOrder || first.fullName.localeCompare(second.fullName)
  })

  const openConversation = (user) => {
    if (isRecording || recordedAudio) {
      toast.error('Send or discard your voice note before switching chats.')
      return
    }
    setSelectedUser(user)
    setMobileChatOpen(true)
    getMessages(user._id)
  }

  const enableDesktopNotifications = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported')
      toast.error('Desktop notifications are not supported in this browser.')
      return
    }
    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') toast.success('Desktop message notifications are enabled.')
      else if (permission === 'denied') toast.error('Notifications are blocked in your browser settings.')
    } catch (error) {
      console.error('Could not enable desktop notifications:', error)
      toast.error('Could not enable desktop notifications.')
    }
  }

  const releaseRecordingResources = () => {
    window.clearInterval(recordingIntervalRef.current)
    window.clearTimeout(recordingTimeoutRef.current)
    recordingIntervalRef.current = null
    recordingTimeoutRef.current = null
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
    recordingStreamRef.current = null
  }

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      toast.error('Voice recording is not supported in this browser.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordingStreamRef.current = stream
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      audioChunksRef.current = []
      cancelRecordingRef.current = false
      setRecordingSeconds(0)
      recordingStartedAtRef.current = Date.now()
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        releaseRecordingResources()
        setIsRecording(false)
        toast.error('Voice recording failed. Please try again.')
      }
      recorder.onstop = () => {
        releaseRecordingResources()
        setIsRecording(false)
        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false
          audioChunksRef.current = []
          setRecordingSeconds(0)
          return
        }
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        audioChunksRef.current = []
        if (!blob.size) {
          toast.error('No voice audio was recorded.')
          return
        }
        if (blob.size > 6 * 1024 * 1024) {
          toast.error('Voice notes must be smaller than 6 MB. Please record a shorter note.')
          return
        }
        const reader = new FileReader()
        setIsProcessingAudio(true)
        reader.onload = () => {
          setRecordedAudio(String(reader.result))
          setAudioPreviewUrl(URL.createObjectURL(blob))
          setIsProcessingAudio(false)
        }
        reader.onerror = () => {
          setIsProcessingAudio(false)
          toast.error('Could not prepare the voice note.')
        }
        reader.readAsDataURL(blob)
      }
      recorder.start()
      setIsRecording(true)
      recordingIntervalRef.current = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000)
        setRecordingSeconds(seconds)
        if (seconds >= 120) {
          toast('Recording stopped at the 2-minute limit.')
          stopRecording()
        }
      }, 500)
      recordingTimeoutRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === 'recording') {
          toast('Recording stopped at the 2-minute limit.')
          stopRecording()
        }
      }, 120_000)
    } catch (error) {
      releaseRecordingResources()
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        toast.error('Allow microphone access to record a voice note.')
      } else {
        toast.error('Could not access your microphone.')
      }
    }
  }

  const discardAudio = () => {
    if (recorderRef.current?.state === 'recording') {
      cancelRecordingRef.current = true
      stopRecording()
    }
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
    setAudioPreviewUrl('')
    setRecordedAudio('')
    setRecordingSeconds(0)
  }

  const handleImageSelect = (event) => {
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
    if (recordedAudio || isRecording) {
      toast.error('Send or discard your voice note before attaching an image.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setImage(String(reader.result))
      setImageName(file.name)
    }
    reader.onerror = () => toast.error('Could not read this image file.')
    reader.readAsDataURL(file)
  }

  const handleSend = async (event) => {
    event.preventDefault()
    if (isRecording || isProcessingAudio) return
    if (!text.trim() && !image && !recordedAudio) return
    const sent = await sendMessage({ text: text.trim(), image, audio: recordedAudio })
    if (sent) {
      setText('')
      setImage('')
      setImageName('')
      discardAudio()
    }
  }

  const formattedRecordingTime = `${Math.floor(recordingSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(recordingSeconds % 60).toString().padStart(2, '0')}`

  return (
    <main className='chat-layout'>
      <aside className={`contacts-panel ${mobileChatOpen ? 'contacts-hidden-mobile' : ''}`}>
        <div className='contacts-heading'>
          <div>
            <span className='eyebrow'>YOUR INBOX</span>
            <h1>{activeTab === 'chats' ? 'Chats' : activeTab === 'people' ? 'Find people' : 'Requests'}
              <span className='contact-count'>
                {activeTab === 'chats' ? contacts.length : activeTab === 'requests' ? friendRequests.length : people.length}
              </span>
            </h1>
          </div>
          <div className='contacts-heading-actions'>
            <button type='button' className={`notification-toggle ${notificationPermission === 'granted' ? 'notification-enabled' : ''}`}
              onClick={enableDesktopNotifications}
              title={notificationPermission === 'granted' ? 'Desktop notifications enabled'
                : notificationPermission === 'denied' ? 'Notifications blocked in browser settings'
                  : notificationPermission === 'unsupported' ? 'Desktop notifications are not supported'
                    : 'Enable desktop notifications'}
              aria-label={notificationPermission === 'granted' ? 'Desktop notifications enabled'
                : notificationPermission === 'denied' ? 'Notifications blocked in browser settings'
                  : notificationPermission === 'unsupported' ? 'Desktop notifications are not supported'
                    : 'Enable desktop notifications'}
              disabled={notificationPermission === 'granted' || notificationPermission === 'denied' || notificationPermission === 'unsupported'}>
              {notificationPermission === 'granted' ? <BellRing size={15} /> : <Bell size={15} />}
            </button>
            <div className='online-summary'><span className='live-dot' /> {onlineContactsCount} online</div>
          </div>
        </div>
        <div className='inbox-tabs' role='tablist' aria-label='Your connections'>
          <button type='button' role='tab' aria-selected={activeTab === 'chats'}
            className={activeTab === 'chats' ? 'inbox-tab inbox-tab-active' : 'inbox-tab'}
            onClick={() => setActiveTab('chats')}><MessageCircle size={14} /> Chats</button>
          <button type='button' role='tab' aria-selected={activeTab === 'people'}
            className={activeTab === 'people' ? 'inbox-tab inbox-tab-active' : 'inbox-tab'}
            onClick={() => setActiveTab('people')}><Search size={14} /> People</button>
          <button type='button' role='tab' aria-selected={activeTab === 'requests'}
            className={activeTab === 'requests' ? 'inbox-tab inbox-tab-active' : 'inbox-tab'}
            onClick={() => setActiveTab('requests')}>
            <Users size={14} /> Requests
            {friendRequests.length > 0 && <span className='request-count'>{friendRequests.length}</span>}
          </button>
        </div>
        {activeTab === 'people' && (
          <div className='search-wrap'>
            <Search size={17} />
            <input aria-label='Search people' placeholder='Search by name...' value={search}
              onChange={(event) => setSearch(event.target.value)} />
            {search && <button onClick={() => setSearch('')} aria-label='Clear search'>×</button>}
          </div>
        )}
        <div className='contacts-label'>
          <span>{activeTab === 'chats' ? 'YOUR FRIENDS' : activeTab === 'people' ? 'DISCOVER PEOPLE' : 'INCOMING REQUESTS'}</span>
          {activeTab === 'chats' ? <Users size={15} /> : activeTab === 'people' ? <Search size={15} /> : <Clock3 size={15} />}
        </div>
        <div className='contact-list'>
          {activeTab === 'chats' && (isContactsLoading ? (
            <div className='list-state'><LoaderCircle className='animate-spin' size={20} /> Loading friends</div>
          ) : sortedContacts.length ? sortedContacts.map((user, index) => (
            <Fragment key={user._id}>
              {index === 0 && onlineContactsCount > 0 && (
                <div className='inbox-presence-label'>
                  <span>ONLINE NOW</span><span>{onlineContactsCount}</span>
                </div>
              )}
              {index === onlineContactsCount && onlineContactsCount > 0 && (
                <div className='inbox-presence-label inbox-presence-offline'>
                  <span>ALL FRIENDS</span>
                </div>
              )}
            <button className={`contact-row ${selectedUser?._id === user._id ? 'contact-active' : ''}`}
              onClick={() => openConversation(user)}>
              <div className='contact-avatar-wrap'><Avatar user={user} /><span className={`presence-dot ${isOnline(user._id) ? 'is-online' : ''}`} /></div>
              <div className='contact-copy'>
                <strong>{user.fullName}</strong>
                {user.username && <span className='username-subline'>@{user.username}</span>}
                <span>{isOnline(user._id) ? 'Online now' : 'Connected'}</span>
              </div>
              {unreadCounts[user._id] > 0 && (
                <span className='unread-badge' aria-label={`${unreadCounts[user._id]} unread messages`}>
                  {unreadCounts[user._id] > 99 ? '99+' : unreadCounts[user._id]}
                </span>
              )}
              <MoreHorizontal className='contact-more' size={18} />
            </button>
            </Fragment>
          )) : (
            <div className='empty-contacts'>
              <div className='empty-icon'><MessageCircle size={20} /></div>
              <strong>No conversations yet</strong>
              <p>Find people and send a friend request to start connecting.</p>
            </div>
          ))}
          {activeTab === 'people' && (isPeopleLoading ? (
            <div className='list-state'><LoaderCircle className='animate-spin' size={20} /> Searching people</div>
          ) : people.length ? people.map((user) => (
            <div key={user._id} className='contact-row people-row'>
              <Avatar user={user} />
              <div className='contact-copy'><strong>{user.fullName}</strong>
                {user.username && <span className='username-subline'>@{user.username}</span>}
                <span>
                {user.requestStatus === 'accepted' ? 'Already friends'
                  : user.requestStatus === 'pending' && user.requestDirection === 'outgoing' ? 'Request sent'
                    : user.requestStatus === 'pending' ? 'Sent you a request'
                      : user.requestStatus === 'rejected' ? 'Request was declined' : 'Not connected'}
              </span></div>
              {user.requestStatus === 'none' || user.requestStatus === 'rejected' ? (
                <button type='button' className='request-action-button' aria-label={`Send friend request to ${user.fullName}`}
                  disabled={sendingRequestIds.includes(user._id)}
                  onClick={() => sendFriendRequest(user._id)}>
                  {sendingRequestIds.includes(user._id)
                    ? <LoaderCircle className='animate-spin' size={15} />
                    : <><UserPlus size={16} /> Add</>}
                </button>
              ) : user.requestStatus === 'pending' && user.requestDirection === 'incoming' ? (
                <button type='button' className='request-action-button'
                  onClick={() => setActiveTab('requests')}>Respond</button>
              ) : user.requestStatus === 'accepted' ? (
                <Check className='connected-indicator' size={17} aria-label='Connected' />
              ) : (
                <Clock3 className='pending-indicator' size={16} aria-label='Request pending' />
              )}
            </div>
          )) : (
            <div className='empty-contacts'>
              <div className='empty-icon'><Users size={20} /></div>
              <strong>{search.trim() ? 'No people found' : 'No other accounts yet'}</strong>
              <p>{search.trim() ? 'Try searching with another name.' : 'Other accounts will appear here after they sign up.'}</p>
            </div>
          ))}
          {activeTab === 'requests' && (isRequestsLoading ? (
            <div className='list-state'><LoaderCircle className='animate-spin' size={20} /> Loading requests</div>
          ) : friendRequests.length ? friendRequests.map(({ requestId, requester }) => (
            <div key={requestId} className='contact-row people-row request-row'>
              <Avatar user={requester} />
              <div className='contact-copy'>
                <strong>{requester.fullName}</strong>
                {requester.username && <span className='username-subline'>@{requester.username}</span>}
                <span>Wants to connect</span>
              </div>
              <button type='button' className='request-action-button accept-request-button'
                onClick={() => respondToFriendRequest(requestId, 'accept')} aria-label={`Accept ${requester.fullName}'s request`}>
                <Check size={15} /> Accept
              </button>
              <button type='button' className='decline-request-button'
                onClick={() => respondToFriendRequest(requestId, 'reject')} aria-label={`Decline ${requester.fullName}'s request`}>
                <X size={15} />
              </button>
            </div>
          )) : (
            <div className='empty-contacts'>
              <div className='empty-icon'><Clock3 size={20} /></div>
              <strong>No pending requests</strong>
              <p>Friend requests you receive will show up here.</p>
            </div>
          ))}
        </div>
        <div className='contacts-footer'><span className='footer-shield'>✦</span> You can chat after a request is accepted.</div>
      </aside>

      <section className={`conversation-panel ${mobileChatOpen ? 'conversation-visible-mobile' : ''}`}>
        {selectedUser ? (
          <>
            <header className='conversation-header'>
              <button className='mobile-back' onClick={() => { setMobileChatOpen(false); setSelectedUser(null) }} aria-label='Back to contacts'><ArrowLeft size={19} /></button>
              <Avatar user={selectedUser} />
              <div className='conversation-user'>
                <strong>{selectedUser.fullName}</strong>
                {selectedUser.username && <span className='username-subline'>@{selectedUser.username}</span>}
                <span><i className={`presence-dot ${isOnline(selectedUser._id) ? 'is-online' : ''}`} />{isOnline(selectedUser._id) ? 'Online' : 'Away'}</span>
              </div>
              <div className='conversation-actions'><span className='encrypted-tag'>● <span>REALTIME CHAT</span></span><button className='icon-button' aria-label='More options'><MoreHorizontal size={21} /></button></div>
            </header>
            <div className='message-history'>
              <div className='conversation-start'><span>THIS IS THE BEGINNING</span><p>Say hello to {selectedUser.fullName.split(' ')[0]} 👋</p></div>
              {isMessagesLoading ? (
                <div className='messages-loading'><LoaderCircle className='animate-spin' size={22} />Loading conversation…</div>
              ) : messages.map((message) => {
                const isMine = String(message.senderId) === String(authUser?._id)
                return (
                  <div key={message._id} className={`message-line ${isMine ? 'message-mine' : ''}`}>
                    {!isMine && <Avatar user={selectedUser} size='small' />}
                    <div className='message-content'>
                      {message.image && <img className='message-image' src={message.image} alt='Shared attachment' />}
                      {message.audio && <audio className='message-audio' src={message.audio} controls preload='metadata'>Your browser does not support audio playback.</audio>}
                      {message.text && <div className='message-bubble'>{message.text}</div>}
                      <span className='message-time'>{formatTime(message.createdAt)}</span>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <div className='composer-area'>
              {image && <div className='attachment-preview'><img src={image} alt='Selected attachment preview' /><span>{imageName}</span><button onClick={() => { setImage(''); setImageName('') }} aria-label='Remove image'>×</button></div>}
              {(isRecording || isProcessingAudio || audioPreviewUrl) && (
                <div className='voice-note-draft'>
                  {isRecording ? (
                    <><span className='recording-indicator' /><span className='voice-note-label'>Recording voice note</span><span className='voice-recording-timer'>{formattedRecordingTime}</span><button type='button' className='voice-discard-button' onClick={discardAudio} aria-label='Discard recording'><X size={17} /></button></>
                  ) : isProcessingAudio ? (
                    <><LoaderCircle className='animate-spin' size={17} /><span className='voice-note-label'>Preparing voice note…</span></>
                  ) : (
                    <><audio className='voice-preview-player' src={audioPreviewUrl} controls preload='metadata'>Your browser does not support audio playback.</audio><span className='voice-note-label'>Voice note ready</span><button type='button' className='voice-discard-button' onClick={discardAudio} aria-label='Discard voice note'><X size={17} /></button></>
                  )}
                </div>
              )}
              <form className='message-composer' onSubmit={handleSend}>
                <input ref={fileRef} type='file' accept='image/*' hidden onChange={handleImageSelect} />
                <button type='button' className='composer-tool' title='Attach an image' aria-label='Attach an image' onClick={() => fileRef.current?.click()}><ImagePlus size={20} /></button>
                <input className='message-input' placeholder={`Message ${selectedUser.fullName.split(' ')[0]}...`}
                  value={text} onChange={(event) => setText(event.target.value)} aria-label='Write a message' />
                <button type='button' className={`composer-tool voice-record-button ${isRecording ? 'voice-record-active' : ''}`}
                  title={isRecording ? 'Stop recording' : 'Record a voice note'}
                  aria-label={isRecording ? 'Stop recording' : 'Record a voice note'}
                  disabled={isSendingMessage || isProcessingAudio || Boolean(audioPreviewUrl) || Boolean(image)}
                  onClick={isRecording ? stopRecording : startRecording}>
                  {isRecording ? <Square size={17} fill='currentColor' /> : <Mic size={19} />}
                </button>
                <button type='button' className='composer-tool smile-tool' aria-label='Emoji picker' onClick={() => setText((value) => `${value}😊`)}><Smile size={19} /></button>
                <button type='submit' className='send-button' disabled={isSendingMessage || isRecording || isProcessingAudio || (!text.trim() && !image && !recordedAudio)} aria-label='Send message'>
                  {isSendingMessage ? <LoaderCircle className='animate-spin' size={18} /> : <Send size={18} />}
                </button>
              </form>
              <p className='composer-hint'>Press <kbd>Enter</kbd> to send <span>·</span> Keep it kind, keep it blue.</p>
            </div>
          </>
        ) : (
          <div className='welcome-panel'>
            <div className='welcome-art'><div className='welcome-orbit orbit-a' /><div className='welcome-orbit orbit-b' /><div className='welcome-logo'><MessageCircle size={34} /></div><span className='welcome-spark spark-a'>✦</span><span className='welcome-spark spark-b'>✧</span></div>
            <span className='eyebrow'>A LITTLE SPACE TO CONNECT</span>
            <h2>Your next good<br />conversation starts here.</h2>
            <p>Choose someone from your people and say hello. The best chats start with a simple message.</p>
            <div className='welcome-tip'><span>✦</span> Pick a contact on the left to get started</div>
          </div>
        )}
      </section>
    </main>
  )
}

export default HomePage
