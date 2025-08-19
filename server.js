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

// Determinar la URL de MongoDB basada en el entorno
const MONGO_URL = process.env.NODE_ENV === 'production' 
    ? 'mongodb://localhost:27017/masterprompt' 
    : 'mongodb://localhost:27017/prompts';

// Conexión a MongoDB
mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`Conectado a MongoDB en ${MONGO_URL}`);
}).catch(err => {
    console.error('Error al conectar a MongoDB:', err);
});

// Definir el esquema para los prompts
const promptSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use('/masterprompt', express.static(path.join(__dirname, 'public')));

const Prompt = mongoose.model('Prompt', promptSchema);

// Variables para seguimiento del prompt activo
let activePrompt = null;

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
    
    // Actualizar el prompt activo cuando se crea uno nuevo
    activePrompt = newPrompt;
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

// Nueva API para obtener el prompt activo
app.get(`/${APP_PATH}/api/active-prompt`, (req, res) => {
  if (activePrompt) {
    res.json(activePrompt);
  } else {
    res.status(404).json({ message: 'No active prompt' });
  }
});

// Nueva API para borrar un prompt
app.delete(`/${APP_PATH}/api/prompts/:id`, async (req, res) => {
  try {
    const prompt = await Prompt.findByIdAndDelete(req.params.id);
    if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
    
    // Notificar a todos los clientes que se ha borrado un prompt
    io.emit('prompt-deleted', { id: req.params.id });
    
    // Si el prompt borrado era el activo, establecer activePrompt a null
    if (activePrompt && activePrompt._id.toString() === req.params.id) {
      activePrompt = null;
    }
    
    res.json({ message: 'Prompt deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Crear el servidor HTTP
const server = http.createServer(app);

// Adjuntar socket.io al servidor HTTP
const io = socketIo(server, {
  path: `/${APP_PATH}/socket.io`,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  },
  allowEIO3: true,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});

io.on('connection', (socket) => {
  console.log('Cliente conectado: ' + socket.id);
  
  // Handle text synchronization - real-time for every keystroke
  socket.on('text-update', (data) => {
    const text = data.text || '';
    socket.broadcast.emit('text-update', text);
    console.log('Text updated:', text);
  });
  
  // Handle prompt selection from gallery
  socket.on('select-prompt', (data) => {
    io.emit('load-prompt', data);
    console.log('Prompt selected:', data._id);
    
    // Actualizar el prompt activo cuando se selecciona uno
    if (data && data._id) {
      activePrompt = data;
    }
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
    console.log('TEXT:', data);
    
    // Actualizar el prompt activo cuando se rota a uno nuevo
    if (data && data.promptId) {
      // Si tenemos el ID, buscamos el prompt completo en la base de datos
      Prompt.findById(data.promptId)
        .then(prompt => {
          if (prompt) {
            activePrompt = prompt;
          } else if (data.promptText) {
            // Si no encontramos el prompt pero tenemos el texto, creamos uno temporal
            activePrompt = { 
              content: data.promptText, 
              _id: data.promptId,
              createdAt: new Date()
            };
          }
        })
        .catch(err => console.error('Error al buscar prompt activo:', err));
    } else if (data && data.promptText) {
      // Si solo tenemos el texto, creamos un prompt temporal
      activePrompt = { 
        content: data.promptText, 
        createdAt: new Date(),
        isTemporary: true
      };
    }
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
