#!/bin/bash

# Script para iniciar la aplicación MasterPrompt en el VPS

# Directorio de la aplicación
APP_DIR="/root/masterprompt"

# Asegurarse de que estamos en el directorio correcto
cd $APP_DIR

# Establecer NODE_ENV a producción
export NODE_ENV=production

# Iniciar la aplicación con PM2
# Si PM2 no está instalado: npm install -g pm2
#pm2 start server.js --name "masterprompt" --log ./logs/app.log
