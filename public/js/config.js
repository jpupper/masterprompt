const APP_PATH = 'masterprompt';  // Variable global para el nombre de la aplicación
const PORT = 3451;  // Variable global para el puerto

// Make APP_PATH available globally
window.APP_PATH = APP_PATH;

const config = {
  getSocketConfig: function() {
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
      return {
        url: `http://localhost:${PORT}`,
        options: {
          path: `/${APP_PATH}/socket.io`,
          transports: ['websocket', 'polling']
        }
      };
    } else {
      // Configuración para VPS
      return {
        url: window.location.origin,
        options: {
          path: `/${APP_PATH}/socket.io`,
          transports: ['websocket', 'polling']
        }
      };
    }
  }
};
