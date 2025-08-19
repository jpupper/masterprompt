import socketio
import time
from pythonosc import udp_client

# Crear el cliente Socket.IO
sio = socketio.Client()

# Crear cliente OSC para enviar a TouchDesigner en puerto 4800
osc_client = udp_client.SimpleUDPClient("127.0.0.1", 4800)

# URL del servidor
#SERVER_URL = 'http://localhost:3451'

SERVER_URL = 'https://vps-4455523-x.dattaweb.com/' 
APP_PATH = 'masterprompt'

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
    
    # Enviar por OSC - siempre /mensaje con el contenido
    osc_client.send_message("/mensaje", data.get("content", ""))

@sio.on('text-update')
def on_text_update(data):
    print('\n=== Actualización de Texto ===')
    print(data)
    osc_client.send_message("/mensaje", data.get("text", ""))

@sio.on('load-prompt')
def on_load_prompt(data):
    print('\n=== Prompt Seleccionado ===')
    print(f'ID: {data.get("_id")}')
    print(f'Contenido: {data.get("content")}')
    osc_client.send_message("/mensaje", data.get("content", ""))

@sio.on('prompt-deleted')
def on_prompt_deleted(data):
    print('\n=== Prompt Eliminado ===')
    print(f'ID: {data.get("id")}')
    osc_client.send_message("/mensaje", "")

@sio.on('rotate-prompt')
def on_rotate_prompt(data):
    print('\n=== Rotación de Prompt ===')
    print(f'Índice: {data.get("promptIndex")}')
    print(f'Texto: {data.get("promptText")}')
    osc_client.send_message("/mensaje", data.get("promptText", ""))

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
