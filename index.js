import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import routes from './src/routes/index.js';
// import connectDB from './config/db.js';
import { Server } from "socket.io";
import http from "http";

dotenv.config();
// connectDB();

const app = express();

// ✅ Proper CORS setup using frontend URL from .env
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from localhost and your LAN IP
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://192.168.0.141:3000',
      'web.smsforyou.biz'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS not allowed for: ${origin}`));
    }
  },
  credentials: true,
};


app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());



// Only redirect if the path is exactly '/'
app.get('/', (req, res) => res.redirect('https://web.smsforyou.biz'));

const server = http.createServer(app);
const io = new Server(server, {
  cors:corsOptions
});

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  // Track rooms the socket is already in
  const userRooms = new Set();

  // Handle join room
  socket.on("joinRoom", (userId, callback) => {
    if (!userId) {
      console.error("Invalid userId for joining room:", userId);
      return callback?.({ success: false, error: "Invalid userId" });
    }

    // Prevent duplicate room joining
    if (userRooms.has(userId)) {
      return callback?.({ success: true, message: "Already in room" });
    }

    socket.join(userId);
    userRooms.add(userId);
    console.log(`User with ID ${userId} joined the room with Socket ID ${socket.id}`);

    callback?.({ success: true });
  });

  // Handle leave room
  socket.on("leaveRoom", (userId) => {
    if (userId && userRooms.has(userId)) {
      socket.leave(userId);
      userRooms.delete(userId);
      console.log(`User with ID ${userId} left the room`);
    }
  });

  // ... rest of your socket handlers
});

// Attach `io` instance to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API routes
app.post('/api/send-data', (req, res) => {
  const data = req.body; // Assume { userId, payload }

  // Emit event to specific room/user
  req.io.to(data.userId).emit("dataUpdate", {
    message: "New Data Received",
    payload: data.payload,
  });

  res.status(200).json({ success: true, message: "Data sent" });
});

app.use('/api', routes);

const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server + Socket.IO running at http://${HOST === '0.0.0.0' ? '192.168.0.141' : HOST}:${PORT}`);
});
