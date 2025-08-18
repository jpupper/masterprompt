const APP_PATH = 'pizarraia';  // Variable global para el nombre de la aplicación
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
          path: `/${APP_PATH}/socket.io`
        }
      };
    } else {
      return {
        url: 'https://vps-4455523-x.dattaweb.com',
        options: {
          path: `/${APP_PATH}/socket.io`
        }
      };
    }
  }
};
