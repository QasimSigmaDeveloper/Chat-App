import { create } from 'zustand'
import toast from 'react-hot-toast'
import { axiosInstance } from '../lib/axios.js'
import { useAuthStore } from './useAuthStore.js'

export const useChatStore = create((set, get) => ({
  contacts: [],
  people: [],
  friendRequests: [],
  peopleSearch: '',
  sendingRequestIds: [],
  messages: [],
  selectedUser: null,
  unreadCounts: {},
  isContactsLoading: false,
  isPeopleLoading: false,
  isRequestsLoading: false,
  isMessagesLoading: false,
  isSendingMessage: false,

  getContacts: async () => {
    set({ isContactsLoading: true })
    try {
      const { data } = await axiosInstance.get('/friends/contacts')
      set({ contacts: data })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load your friends.')
    } finally {
      set({ isContactsLoading: false })
    }
  },

  getFriendRequests: async () => {
    set({ isRequestsLoading: true })
    try {
      const { data } = await axiosInstance.get('/friends/requests')
      set({ friendRequests: data })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load friend requests.')
    } finally {
      set({ isRequestsLoading: false })
    }
  },

  searchPeople: async (search) => {
    const query = search.trim()
    set({ peopleSearch: query })
    set({ isPeopleLoading: true })
    try {
      const { data } = await axiosInstance.get('/friends/search', { params: { q: query } })
      if (get().peopleSearch === query) set({ people: data })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not search for people.')
    } finally {
      if (get().peopleSearch === query) set({ isPeopleLoading: false })
    }
  },

  sendFriendRequest: async (userId) => {
    if (get().sendingRequestIds.includes(userId)) return false
    set((state) => ({ sendingRequestIds: [...state.sendingRequestIds, userId] }))
    try {
      const { data } = await axiosInstance.post(`/friends/requests/${userId}`)
      set((state) => ({
        people: state.people.map((person) => person._id === userId
          ? { ...person, requestStatus: 'pending', requestDirection: 'outgoing', requestId: data.requestId }
          : person),
      }))
      toast.success('Friend request sent.')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send the friend request.')
      return false
    } finally {
      set((state) => ({
        sendingRequestIds: state.sendingRequestIds.filter((id) => id !== userId),
      }))
    }
  },

  respondToFriendRequest: async (requestId, action) => {
    try {
      await axiosInstance.patch(`/friends/requests/${requestId}`, { action })
      set((state) => ({
        friendRequests: state.friendRequests.filter((request) => request.requestId !== requestId),
      }))
      if (action === 'accept') {
        await get().getContacts()
        toast.success('Friend request accepted. You can start chatting now.')
      } else {
        toast.success('Friend request declined.')
      }
      if (get().peopleSearch) await get().searchPeople(get().peopleSearch)
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update the friend request.')
      return false
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true, messages: [] })
    try {
      const { data } = await axiosInstance.get(`/message/${userId}`)
      if (String(get().selectedUser?._id) === String(userId)) set({ messages: data })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load this conversation.')
    } finally {
      set({ isMessagesLoading: false })
    }
  },

  setSelectedUser: (selectedUser) => set((state) => ({
    selectedUser,
    messages: [],
    unreadCounts: selectedUser
      ? { ...state.unreadCounts, [selectedUser._id]: 0 }
      : state.unreadCounts,
  })),

  markConversationRead: (userId) => set((state) => ({
    unreadCounts: { ...state.unreadCounts, [userId]: 0 },
  })),

  sendMessage: async (messageData) => {
    const { selectedUser } = get()
    if (!selectedUser) return false
    set({ isSendingMessage: true })
    try {
      const { data } = await axiosInstance.post(`/message/send/${selectedUser._id}`, messageData)
      set((state) => ({ messages: [...state.messages, data] }))
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Message could not be sent.')
      return false
    } finally {
      set({ isSendingMessage: false })
    }
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket
    if (!socket) return () => {}

    const onNewMessage = (newMessage) => {
      const { selectedUser } = get()
      const authUser = useAuthStore.getState().authUser
      if (String(newMessage.receiverId) !== String(authUser?._id)) return

      const senderId = String(newMessage.senderId)
      const isVisibleConversation = (
        selectedUser &&
        String(selectedUser._id) === senderId &&
        document.visibilityState === 'visible'
      )

      if (isVisibleConversation) {
        set((state) => ({ messages: [...state.messages, newMessage] }))
        return
      }

      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [senderId]: (state.unreadCounts[senderId] || 0) + 1,
        },
      }))

      const sender = get().contacts.find((contact) => String(contact._id) === senderId)
      const preview = newMessage.text?.trim()
        || (newMessage.image ? 'Sent a photo' : newMessage.audio ? 'Sent a voice message' : 'Sent you a message')
      toast(`${sender?.fullName || 'New message'}: ${preview}`, { icon: '💬' })

      if (document.visibilityState === 'hidden' && 'Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(sender?.fullName || 'New message', {
          body: preview,
          icon: sender?.profilePic || undefined,
          tag: `message-${senderId}`,
        })
        notification.onclick = () => {
          window.focus()
          notification.close()
        }
      }
    }
    socket.on('newMessage', onNewMessage)
    return () => socket.off('newMessage', onNewMessage)
  },
}))
