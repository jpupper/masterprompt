document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const promptEditor = document.getElementById('prompt-editor');
    const saveButton = document.getElementById('save-button');
    const loadButton = document.getElementById('load-button');
    const prevButton = document.getElementById('prev-button');
    const nextButton = document.getElementById('next-button');
    const galleryContent = document.getElementById('gallery-content');
    const galleryCounter = document.getElementById('gallery-counter');
    const connectionStatus = document.getElementById('connection-status');
    const galleryToggle = document.getElementById('gallery-toggle');
    const syncToggle = document.getElementById('sync-toggle');
    const rotationTimeInput = document.getElementById('rotation-time');
    
    // Get APP_PATH from config
    const APP_PATH = window.APP_PATH || 'masterprompt';
    
    // Socket connection
    const socketConfig = config.getSocketConfig();
    console.log('Socket config:', socketConfig);
    const socket = io(socketConfig.url, socketConfig.options);
    
    // Verificar conexión
    socket.on('connect_error', (error) => {
        console.error('Error de conexión:', error);
        connectionStatus.textContent = 'Error de conexión';
        connectionStatus.classList.remove('connected');
    });
    
    // Variables
    let prompts = [];
    let currentPromptIndex = -1;
    let isTyping = false;
    let typingTimer;
    let rotationTimer;
    let isGalleryMode = false;
    let isSyncMode = true; // Por defecto, la sincronización está activada
    let rotationTime = parseInt(rotationTimeInput.value) || 5; // seconds
    
    // Connect to socket
    socket.on('connect', () => {
        connectionStatus.textContent = 'Conectado';
        connectionStatus.classList.add('connected');
        console.log('Connected to server with ID:', socket.id);
        
        // Load prompts from database
        loadPrompts();
    });
    
    // Socket events
    socket.on('disconnect', () => {
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.classList.remove('connected');
        console.log('Disconnected from server');
    });
    
    socket.on('text-update', (data) => {
        if (!isGalleryMode && data.text !== promptEditor.value) {
            promptEditor.value = data.text;
        }
    });
    
    socket.on('load-prompt', (data) => {
        if (!isGalleryMode && data.text !== promptEditor.value) {
            promptEditor.value = data.text;
        }
    });
    
    socket.on('new-prompt', () => {
        loadPrompts();
    });
    
    socket.on('gallery-mode', (data) => {
        setGalleryMode(data.isActive, data.promptIndex);
    });
    
    socket.on('rotate-prompt', (data) => {
        if (isGalleryMode && isSyncMode && data.promptIndex !== currentPromptIndex) {
            currentPromptIndex = data.promptIndex;
            displayPrompt(currentPromptIndex);
        }
    });
    
    // Event listeners
    promptEditor.addEventListener('input', () => {
        if (isGalleryMode) return; // Don't allow editing in gallery mode
        
        // Emit text update for every keystroke for real-time sync
        socket.emit('text-update', { text: promptEditor.value });
    });
    
    saveButton.addEventListener('click', savePrompt);
    loadButton.addEventListener('click', loadSelectedPrompt);
    prevButton.addEventListener('click', showPreviousPrompt);
    nextButton.addEventListener('click', showNextPrompt);
    galleryToggle.addEventListener('click', toggleGalleryMode);
    syncToggle.addEventListener('click', toggleSyncMode);
    rotationTimeInput.addEventListener('change', updateRotationTime);
    
    // Functions
    async function loadPrompts() {
        try {
            const response = await fetch(`/${APP_PATH}/api/prompts`);
            if (!response.ok) {
                throw new Error('Failed to load prompts');
            }
            
            prompts = await response.json();
            updateGallery();
        } catch (error) {
            console.error('Error loading prompts:', error);
            galleryContent.innerHTML = '<p class="empty-gallery">Error al cargar los prompts</p>';
        }
    }
    
    async function savePrompt() {
        const content = promptEditor.value.trim();
        
        if (!content) {
            return; // Don't save empty prompts
        }
        
        try {
            const response = await fetch(`/${APP_PATH}/api/prompts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ content })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save prompt');
            }
            
            const newPrompt = await response.json();
            
            // Check for duplicates before adding to the array
            const isDuplicate = prompts.some(prompt => prompt._id === newPrompt._id);
            if (!isDuplicate) {
                prompts.unshift(newPrompt);
                updateGallery();
                // No alert - removed as requested
            }
        } catch (error) {
            console.error('Error saving prompt:', error);
            // No alert for errors either
        }
    }
    
    function updateGallery() {
        if (prompts.length === 0) {
            galleryContent.innerHTML = '<p class="empty-gallery">No hay prompts guardados</p>';
            return;
        }
        galleryContent.innerHTML = '';
        
        prompts.forEach((prompt, index) => {
            const promptElement = document.createElement('div');
            promptElement.className = 'prompt-item';
            if (index === currentPromptIndex) {
                promptElement.classList.add('active');
            }
            
            // Crear contenedor para el prompt y botón de borrar
            const promptContainer = document.createElement('div');
            promptContainer.className = 'prompt-container';
            
            // Truncate text for display
            const truncatedText = prompt.content.length > 50 ? 
                prompt.content.substring(0, 50) + '...' : 
                prompt.content;
            
            // Texto del prompt
            const promptText = document.createElement('div');
            promptText.className = 'prompt-text';
            promptText.textContent = truncatedText;
            promptText.dataset.index = index;
            
            promptText.addEventListener('click', () => {
                currentPromptIndex = index;
                displayPrompt(currentPromptIndex);
                loadSelectedPrompt();
            });
            
            // Botón de borrar
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.textContent = 'X';
            deleteButton.dataset.id = prompt._id;
            
            // Evento para borrar sin confirmación
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Evitar que se active el click del prompt
                deletePrompt(prompt._id, index);
            });
            
            // Agregar elementos al contenedor
            promptContainer.appendChild(promptText);
            promptContainer.appendChild(deleteButton);
            promptElement.appendChild(promptContainer);
            
            galleryContent.appendChild(promptElement);
        });
        
        updateCounter();
        loadButton.disabled = currentPromptIndex === -1;
        prevButton.disabled = currentPromptIndex <= 0;
        nextButton.disabled = currentPromptIndex >= prompts.length - 1 || currentPromptIndex === -1;
    }
    
    function selectPrompt(index) {
        currentPromptIndex = index;
        updateGallery();
        loadButton.disabled = false;
    }
    
    function loadSelectedPrompt() {
        if (currentPromptIndex >= 0 && currentPromptIndex < prompts.length) {
            const selectedPrompt = prompts[currentPromptIndex];
            promptEditor.value = selectedPrompt.content;
            socket.emit('select-prompt', selectedPrompt);
        }
    }
    
    function showPreviousPrompt() {
        if (prompts.length > 0) {
            // Move to previous prompt or to last if at beginning
            currentPromptIndex = currentPromptIndex <= 0 ? prompts.length - 1 : currentPromptIndex - 1;
            displayPrompt(currentPromptIndex);
            
            // Notify other clients if sync mode is on
            if (isSyncMode) {
                const currentPrompt = prompts[currentPromptIndex];
                socket.emit('rotate-prompt', { 
                    promptIndex: currentPromptIndex,
                    promptText: currentPrompt.content,
                    promptId: currentPrompt._id
                });
            }
        }
    }
    
    function showNextPrompt() {
        if (prompts.length > 0) {
            // Move to next prompt or back to first
            currentPromptIndex = (currentPromptIndex + 1) % prompts.length;
            displayPrompt(currentPromptIndex);
            
            // Notify other clients if sync mode is on
            if (isSyncMode) {
                const currentPrompt = prompts[currentPromptIndex];
                socket.emit('rotate-prompt', { 
                    promptIndex: currentPromptIndex,
                    promptText: currentPrompt.content,
                    promptId: currentPrompt._id
                });
            }
        }
    }
    
    function updateCounter() {
        if (prompts.length === 0) {
            galleryCounter.textContent = '0/0';
        } else {
            galleryCounter.textContent = `${currentPromptIndex + 1}/${prompts.length}`;
        }
    }
    
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }
    
    // Gallery mode functions
    function toggleGalleryMode() {
        isGalleryMode = !isGalleryMode;
        
        // Update UI
        galleryToggle.textContent = isGalleryMode ? 'ON' : 'OFF';
        galleryToggle.classList.toggle('active', isGalleryMode);
        
        // Make text editor readonly in gallery mode
        promptEditor.readOnly = isGalleryMode;
        
        // Notify other clients
        if (isSyncMode) {
            socket.emit('gallery-mode', { isActive: isGalleryMode, promptIndex: currentPromptIndex });
        }
        
        if (isGalleryMode) {
            // Start auto-rotation if we have prompts
            if (prompts.length > 0) {
                if (currentPromptIndex === -1) {
                    currentPromptIndex = 0;
                }
                startAutoRotation();
            }
        } else {
            // Stop auto-rotation
            stopAutoRotation();
        }
    }
    
    // Sync mode function
    function toggleSyncMode() {
        isSyncMode = !isSyncMode;
        
        // Update UI
        syncToggle.textContent = isSyncMode ? 'ON' : 'OFF';
        syncToggle.classList.toggle('active', isSyncMode);
        
        // If we're in gallery mode and sync was just turned on, notify others of our current position
        if (isGalleryMode && isSyncMode && currentPromptIndex >= 0) {
            socket.emit('rotate-prompt', { promptIndex: currentPromptIndex });
        }
    }
    
    function updateRotationTime() {
        rotationTime = parseInt(rotationTimeInput.value) || 5;
        
        // Restart rotation if gallery mode is active
        if (isGalleryMode) {
            stopAutoRotation();
            startAutoRotation();
        }
    }
    
    function startAutoRotation() {
        // Clear any existing timer
        stopAutoRotation();
        
        // Start new timer
        rotationTimer = setInterval(() => {
            if (prompts.length > 0) {
                // Move to next prompt or back to first
                currentPromptIndex = (currentPromptIndex + 1) % prompts.length;
                displayPrompt(currentPromptIndex);
                
                // Notify other clients only if sync mode is on
                if (isSyncMode) {
                    const currentPrompt = prompts[currentPromptIndex];
                    socket.emit('rotate-prompt', { 
                        promptIndex: currentPromptIndex,
                        promptText: currentPrompt.content,
                        promptId: currentPrompt._id
                    });
                }
            }
        }, rotationTime * 1000);
    }
    
    function stopAutoRotation() {
        if (rotationTimer) {
            clearInterval(rotationTimer);
            rotationTimer = null;
        }
    }
    
    function displayPrompt(index) {
        if (index >= 0 && index < prompts.length) {
            // Update UI
            promptEditor.value = prompts[index].content;
            updateGallery();
        }
    }
    
    // Función para borrar un prompt
    function deletePrompt(promptId, index) {
        // Llamar a la API para borrar el prompt
        fetch(`/${APP_PATH}/api/prompts/${promptId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (response.ok) {
                // Eliminar el prompt del array local
                prompts.splice(index, 1);
                
                // Ajustar el índice actual si es necesario
                if (currentPromptIndex >= prompts.length) {
                    currentPromptIndex = prompts.length - 1;
                    if (currentPromptIndex < 0) currentPromptIndex = 0;
                }
                
                // Actualizar la galería
                updateGallery();
                
                // Si hay prompts, mostrar el actual
                if (prompts.length > 0) {
                    displayPrompt(currentPromptIndex);
                } else {
                    // Si no hay prompts, limpiar el editor
                    promptEditor.value = '';
                }
            } else {
                console.error('Error al borrar el prompt');
            }
        })
        .catch(error => console.error('Error:', error));
    }
});
