# Sistema de Sincronización de Prompts

Este sistema permite la sincronización en tiempo real de un campo de texto entre múltiples clientes mediante sockets, con la capacidad de guardar los prompts en una base de datos MongoDB y visualizarlos en una galería.

## Características

- Sincronización en tiempo real del campo de texto entre múltiples clientes
- Guardado de prompts en base de datos MongoDB
- Galería para navegar entre los prompts guardados
- Configuración para entorno local y VPS
- Interfaz de usuario intuitiva y responsive

## Requisitos

- Node.js (v14 o superior)
- MongoDB (v4 o superior)
- npm o yarn

## Instalación

1. Clona el repositorio o descomprime los archivos en tu directorio de trabajo
2. Instala las dependencias:

```bash
npm install
```

## Configuración

El sistema está configurado para funcionar tanto en entorno local como en un VPS:

- **Entorno local**: http://localhost:3451/pizarraia
- **Entorno VPS**: https://vps-4455523-x.dattaweb.com/masterprompt

La configuración de los sockets se maneja automáticamente en el archivo `public/js/config.js`.

## Ejecución

Para iniciar el servidor:

```bash
npm start
```

Para desarrollo (con reinicio automático):

```bash
npm run dev
```

## Estructura del proyecto

```
server2/
├── public/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── config.js
│   │   └── main.js
│   └── index.html
├── server.js
├── package.json
└── README.md
```

## Uso

1. Abre la aplicación en tu navegador (http://localhost:3451 o http://localhost:3451/pizarraia)
2. Escribe en el campo de texto y verás cómo se sincroniza en tiempo real en otras pestañas o navegadores
3. Guarda los prompts usando el botón "Guardar Prompt"
4. Navega por los prompts guardados usando los botones "Anterior" y "Siguiente"
5. Carga un prompt guardado en el editor usando el botón "Cargar Prompt Seleccionado"
