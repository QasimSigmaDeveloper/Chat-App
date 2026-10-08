# BlueChat

BlueChat is a real-time chat application with a React client and an Express,
MongoDB, and Socket.IO server.

## Features

- Sign up, sign in, profile management, and cookie-based authentication
- Search for people, send friend requests, and manage incoming requests
- Real-time messaging with online presence
- Unread message counts and in-app notifications
- Image and voice-message attachments stored with Cloudinary
- Responsive chat interface

## Requirements

- Node.js and npm
- MongoDB connection string
- Cloudinary account for image and voice-message uploads

## Getting started

Clone the repository, then install dependencies in both apps:

```bash
cd server
npm install
cd ../client
npm install
```

### Configure the server

Create `server/.env`:

```env
PORT=5001
CLIENT_URL=http://localhost:5173
MONGODB_URI=your_mongodb_connection_string
SECRETKEY=replace_with_a_long_random_secret
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
```

Keep real credentials private. Do not commit `.env` files.

### Configure the client (optional)

The client defaults to the local server URLs below. To use different URLs,
create `client/.env`:

```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
```

### Run the apps

Start each app in a separate terminal:

```bash
# Terminal 1
cd server
npm run dev
```

```bash
# Terminal 2
cd client
npm run dev
```

Open the client URL printed by Vite (by default, `http://localhost:5173`).

## Available scripts

### Client (`client/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build in `client/dist` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

### Server (`server/`)

| Command | Description |
| --- | --- |
| `npm run dev` | Start the API and Socket.IO server with Nodemon |

## Project layout

```text
client/   React application, UI, and Socket.IO client
server/   Express API, MongoDB models, and Socket.IO server
```
