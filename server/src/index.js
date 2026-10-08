import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import authRoutes from './routes/auth.route.js'
import messageRoutes from './routes/message.route.js'
import friendRoutes from './routes/friend.route.js'
import { connectionDB } from './lib/db.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 5001
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(cors({ origin: CLIENT_URL, credentials: true }))

app.use('/api/auth', authRoutes)
app.use('/api/message', messageRoutes)
app.use('/api/friends', friendRoutes)

const io = new Server(httpServer, {
  cors: { origin: CLIENT_URL, credentials: true },
})

const activeUsers = new Map()

io.use((socket, next) => {
  const token = socket.handshake.headers.cookie
    ?.split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith('jwt='))
    ?.slice(4)

  if (!token) return next(new Error('Unauthorized'))
  try {
    const decoded = jwt.verify(decodeURIComponent(token), process.env.SECRETKEY)
    socket.data.userId = String(decoded.userId)
    next()
  } catch {
    next(new Error('Unauthorized'))
  }
})

io.on('connection', (socket) => {
  const userId = socket.data.userId
  const userSockets = activeUsers.get(userId) || new Set()
  userSockets.add(socket.id)
  activeUsers.set(userId, userSockets)
  socket.join(`user:${userId}`)
  io.emit('getOnlineUsers', [...activeUsers.keys()])

  socket.on('disconnect', () => {
    const connectedSockets = activeUsers.get(userId)
    connectedSockets?.delete(socket.id)
    if (connectedSockets?.size === 0) activeUsers.delete(userId)
    io.emit('getOnlineUsers', [...activeUsers.keys()])
  })
})

app.set('io', io)

httpServer.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`)
  await connectionDB()
})
