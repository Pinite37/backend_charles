import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import emailRoutes from './src/routes/emailRoutes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
  }
});

app.use(bodyParser.json());
app.use(cors());

// Middleware to pass io to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api', emailRoutes);

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
