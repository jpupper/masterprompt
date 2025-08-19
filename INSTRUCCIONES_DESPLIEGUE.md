# Instrucciones para desplegar MasterPrompt en el VPS

## 1. Preparación del servidor

### Transferir archivos al VPS
```bash
# Desde tu máquina local, usa scp o rsync para transferir los archivos
# Ejemplo con scp:
scp -r /ruta/local/MasterServerPromptingv2/server2/ root@vps-4455523-x.dattaweb.com:/root/masterprompt
```

### Instalar dependencias
```bash
# Conectarse al VPS
ssh root@vps-4455523-x.dattaweb.com

# Navegar al directorio de la aplicación
cd /root/masterprompt

# Instalar dependencias
npm install

# Instalar PM2 globalmente si no está instalado
npm install -g pm2
```

## 2. Configurar MongoDB

```bash
# Verificar que MongoDB esté instalado y en ejecución
systemctl status mongod

# Si no está instalado, instalarlo:
# Para Ubuntu/Debian:
apt-get update
apt-get install -y mongodb

# Para CentOS/RHEL:
# yum install -y mongodb-org

# Iniciar MongoDB y habilitarlo para que se inicie con el sistema
systemctl start mongod
systemctl enable mongod

# Crear la base de datos para MasterPrompt
mongo
> use masterprompt
> exit
```

## 3. Configurar Nginx

### Agregar la configuración de MasterPrompt a Nginx
```bash
# Abrir el archivo de configuración de Nginx
nano /etc/nginx/sites-available/default  # o la ruta a tu archivo de configuración

# Agregar el bloque de configuración de MasterPrompt dentro del bloque server { ... }
# Copiar y pegar el contenido del archivo nginx-masterprompt.conf
```

El bloque a agregar es:

```nginx
# APLICACIÓN: MasterPrompt (puerto 3451)
location /masterprompt {
    proxy_pass http://localhost:3451;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Configuración específica para WebSockets de MasterPrompt
location /masterprompt/socket.io/ {
    proxy_pass http://localhost:3451/masterprompt/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_read_timeout 86400;
}
```

### Verificar y reiniciar Nginx
```bash
# Verificar la configuración de Nginx
nginx -t

# Si la configuración es correcta, reiniciar Nginx
systemctl restart nginx
```

## 4. Iniciar la aplicación

### Usando el script de inicio
```bash
# Dar permisos de ejecución al script
chmod +x /root/masterprompt/start-masterprompt.sh

# Ejecutar el script
/root/masterprompt/start-masterprompt.sh
```

### O manualmente con PM2
```bash
# Navegar al directorio de la aplicación
cd /root/masterprompt

# Establecer NODE_ENV a producción
export NODE_ENV=production

# Iniciar la aplicación con PM2
pm2 start server.js --name "masterprompt" --log ./logs/app.log

# Configurar PM2 para iniciar automáticamente después de un reinicio
pm2 startup
pm2 save
```

## 5. Verificar el funcionamiento

1. Abre un navegador y visita: `https://vps-4455523-x.dattaweb.com/masterprompt`
2. Verifica que la aplicación se cargue correctamente
3. Prueba la funcionalidad de sincronización en tiempo real abriendo la aplicación en dos pestañas diferentes
4. Prueba el modo galería y la sincronización ON/OFF

## 6. Solución de problemas

### Verificar logs de la aplicación
```bash
# Ver logs de PM2
pm2 logs masterprompt

# Ver logs en tiempo real
tail -f /root/masterprompt/logs/app.log
```

### Verificar logs de Nginx
```bash
# Ver logs de error de Nginx
tail -f /var/log/nginx/error.log

# Ver logs de acceso de Nginx
tail -f /var/log/nginx/access.log
```

### Problemas comunes

1. **Error de conexión a MongoDB**:
   - Verifica que MongoDB esté en ejecución: `systemctl status mongod`
   - Verifica la URL de conexión en `server.js`

2. **Error de WebSockets**:
   - Verifica la configuración de Nginx para WebSockets
   - Asegúrate de que los puertos necesarios estén abiertos en el firewall

3. **La aplicación no se inicia**:
   - Verifica los logs de PM2: `pm2 logs masterprompt`
   - Verifica que todas las dependencias estén instaladas: `npm install`

4. **Problemas de permisos**:
   - Verifica los permisos de los archivos: `chmod -R 755 /root/masterprompt`
