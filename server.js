const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');

const hostname = '0.0.0.0';
const port = 3451;
const APP_PATH = 'masterprompt';  // Variable global

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(`/${APP_PATH}`, express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server with proper file serving
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/prompts', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB', err));

// Create Prompt schema and model
const promptSchema = new mongoose.Schema({
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const Prompt = mongoose.model('Prompt', promptSchema);

// API routes for prompts
app.get(`/${APP_PATH}/api/prompts`, async (req, res) => {
  try {
    const prompts = await Prompt.find().sort({ createdAt: -1 });
    res.json(prompts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post(`/${APP_PATH}/api/prompts`, async (req, res) => {
  try {
    const prompt = new Prompt({
      content: req.body.content
    });
    const newPrompt = await prompt.save();
    res.status(201).json(newPrompt);
    io.emit('new-prompt', newPrompt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.get(`/${APP_PATH}/api/prompts/:id`, async (req, res) => {
  try {
    const prompt = await Prompt.findById(req.params.id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    res.json(prompt);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Adjuntar socket.io al servidor HTTP
const io = socketIo(server, {
  path: `/${APP_PATH}/socket.io`,  // Usando la variable global
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('Cliente conectado: ' + socket.id);
  
  // Handle text synchronization - real-time for every keystroke
  socket.on('text-update', (data) => {
    socket.broadcast.emit('text-update', data);
    console.log('Text updated');
  });
  
  // Handle prompt selection from gallery
  socket.on('select-prompt', (data) => {
    io.emit('load-prompt', data);
    console.log('Prompt selected:', data._id);
  });

  // Handle gallery mode toggle
  socket.on('gallery-mode', (data) => {
    socket.broadcast.emit('gallery-mode', data);
    console.log('Gallery mode changed:', data.isActive ? 'ON' : 'OFF');
  });
  
  // Handle prompt rotation in gallery mode
  socket.on('rotate-prompt', (data) => {
    socket.broadcast.emit('rotate-prompt', data);
    console.log('Rotating to prompt index:', data.promptIndex);
  });

  // Manejar la desconexión del cliente
  socket.on('disconnect', () => {
    console.log('Cliente desconectado: ' + socket.id);
  });
});

// Default route for the root
app.get('/', (req, res) => {
  res.redirect(`/${APP_PATH}`);
});

app.get(`/${APP_PATH}`, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
  console.log(`Application path: /${APP_PATH}`);
  console.log(`Socket.IO path: /${APP_PATH}/socket.io`);
  console.log(`Static files are being served from ${path.join(__dirname, 'public')}`);
});
