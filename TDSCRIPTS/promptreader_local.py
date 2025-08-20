import socketio
import time
from pythonosc import udp_client

# Crear el cliente Socket.IO
sio = socketio.Client()

# Crear cliente OSC para enviar a TouchDesigner en puerto 4800
osc_client = udp_client.SimpleUDPClient("127.0.0.1", 4800)

# URL del servidor y configuración
#SERVER_URL = 'http://localhost:3451'

SERVER_URL = 'http://localhost:3451' 
APP_PATH = 'masterprompt'

# Sesión a la que se conectará (por defecto 1)
import sys

@sio.event
def connect():
    print('Conectado al servidor')

@sio.event
def disconnect():
    print('Desconectado del servidor')

@sio.on('new-prompt')
def on_new_prompt(data):
    print('\n=== Nuevo Prompt Creado ===')
    print(f'ID: {data.get("_id")}')
    print(f'Contenido: {data.get("content")}')
    print(f'Fecha: {data.get("createdAt")}')
    print(f'Sesión: {data.get("session")}')
    
    # Enviar por OSC - mensaje y sesión
    osc_client.send_message("/mensaje", [data.get("content", ""), data.get("session", "1")])

@sio.on('text-update')
def on_text_update(data):
    print('\n=== Actualización de Texto ===')
    print(data)
    osc_client.send_message("/mensaje", [data.get("text", ""), data.get("session", "1")])

@sio.on('load-prompt')
def on_load_prompt(data):
    print('\n=== Prompt Seleccionado ===')
    print(f'ID: {data.get("_id")}')
    print(f'Contenido: {data.get("content")}')
    osc_client.send_message("/mensaje", [data.get("content", ""), data.get("session", "1")])

@sio.on('prompt-deleted')
def on_prompt_deleted(data):
    print('\n=== Prompt Eliminado ===')
    print(f'ID: {data.get("id")}')
    osc_client.send_message("/mensaje", ["", data.get("session", "1")])

@sio.on('rotate-prompt')
def on_rotate_prompt(data):
    print('\n=== Rotación de Prompt ===')
    print(f'Índice: {data.get("promptIndex")}')
    print(f'Texto: {data.get("promptText")}')
    print(f'Sesión: {data.get("session")}')
    osc_client.send_message("/mensaje", [data.get("promptText", ""), data.get("session", "1")])

def main():
    try:
        # Conectar al servidor con la ruta correcta de Socket.IO
        sio.connect(SERVER_URL, socketio_path=f'{APP_PATH}/socket.io')
        print(f'Escuchando eventos en {SERVER_URL}')
        
        # Mantener el script corriendo
        while True:
            time.sleep(1)
            
    except Exception as e:
        print(f'Error: {e}')
    finally:
        if sio.connected:
            sio.disconnect()

if __name__ == '__main__':
    main()
