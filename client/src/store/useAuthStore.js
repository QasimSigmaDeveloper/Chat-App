import { create } from 'zustand'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { axiosInstance } from '../lib/axios.js'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001'

export const useAuthStore = create((set, get) => ({
  authUser: null,
  onlineUsers: [],
  socket: null,
  isSigningUp: false,
  isLoggingIn: false,
  isUpdatingProfile: false,
  isCheckingAuth: true,

  checkAuth: async () => {
    try {
      const { data } = await axiosInstance.get('/auth/check')
      set({ authUser: data })
      get().connectSocket()
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Could not check authentication:', error)
      }
      set({ authUser: null })
    } finally {
      set({ isCheckingAuth: false })
    }
  },

  signup: async (formData) => {
    set({ isSigningUp: true })
    try {
      const { data } = await axiosInstance.post('/auth/signup', formData)
      set({ authUser: data })
      get().connectSocket()
      toast.success('Your account is ready.')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create your account.')
      return false
    } finally {
      set({ isSigningUp: false })
    }
  },

  login: async (formData) => {
    set({ isLoggingIn: true })
    try {
      const { data } = await axiosInstance.post('/auth/login', formData)
      set({ authUser: data })
      get().connectSocket()
      toast.success(`Welcome back, ${data.fullName}.`)
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not sign in.')
      return false
    } finally {
      set({ isLoggingIn: false })
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post('/auth/logout')
      get().disconnectSocket()
      set({ authUser: null, onlineUsers: [] })
      toast.success('You have signed out.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not sign out.')
    }
  },

  updateProfile: async (profilePic) => {
    set({ isUpdatingProfile: true })
    try {
      const { data } = await axiosInstance.put('/auth/update-profile', { profilePic })
      set({ authUser: data })
      toast.success('Profile photo updated.')
      return true
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update your profile.')
      return false
    } finally {
      set({ isUpdatingProfile: false })
    }
  },

  connectSocket: () => {
    const { authUser, socket } = get()
    if (!authUser || (socket && socket.connected)) return

    socket?.disconnect()
    const nextSocket = io(SOCKET_URL, { withCredentials: true })
    nextSocket.on('getOnlineUsers', (onlineUsers) => set({ onlineUsers }))
    nextSocket.on('connect_error', (error) => {
      console.error('Realtime connection failed:', error.message)
    })
    set({ socket: nextSocket })
  },

  disconnectSocket: () => {
    get().socket?.disconnect()
    set({ socket: null, onlineUsers: [] })
  },
}))
