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
    const rotationTimeInput = document.getElementById('rotation-time');
    
    // Modal elements
    const editModal = document.getElementById('edit-modal');
    const editPromptText = document.getElementById('edit-prompt-text');
    const saveEditButton = document.getElementById('save-edit');
    const cancelEditButton = document.getElementById('cancel-edit');
    
    // Get APP_PATH from config
    const APP_PATH = 'masterprompt';
    
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
    
    // API URL configuration
    const API_URL = `/${APP_PATH}/api`;

    // Variables
    let prompts = [];
    let currentPromptIndex = -1;
    let isTyping = false;
    let typingTimer;
    let rotationTimer;
    let isGalleryMode = false;
    let rotationTime = parseInt(rotationTimeInput.value) || 5; // seconds

    // Variables para edición
    let currentEditingPrompt = null;
    
    // Obtener sesión del URL
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('sesion') || '1'; // default a sesión 1

    // Funciones del modal
    function openEditModal(prompt) {
        if (!editModal || !editPromptText) return;
        currentEditingPrompt = prompt;
        editPromptText.value = prompt.content;
        editModal.style.display = 'block';
    }

    function closeEditModal() {
        if (!editModal || !editPromptText) return;
        editModal.style.display = 'none';
        currentEditingPrompt = null;
        editPromptText.value = '';
    }

    async function saveEditedPrompt() {
        if (!currentEditingPrompt || !editPromptText) return;

        try {
            const response = await fetch(`${API_URL}/prompts/${currentEditingPrompt._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: editPromptText.value
                })
            });

            if (response.ok) {
                loadPrompts();
                closeEditModal();
            } else {
                console.error('Error al guardar el prompt');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
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
        if (!data || data.text === undefined || data.text === null) return;
        if (data.session === sessionId && !isGalleryMode && data.text !== promptEditor.value) {
            promptEditor.value = data.text;
        }
    });
    
    socket.on('load-prompt', (data) => {
        if (!data || data.text === undefined || data.text === null) return;
        if (data.session === sessionId && !isGalleryMode && data.text !== promptEditor.value) {
            promptEditor.value = data.text;
        }
    });
    
    socket.on('new-prompt', (data) => {
        if (!data) return;
        if (data.session === sessionId) {
            loadPrompts();
        }
    });
    
    socket.on('gallery-mode', (data) => {
        if (!data) return;
        if (data.session === sessionId) {
            setGalleryMode(data.isActive, data.promptIndex);
        }
    });
    
    socket.on('rotate-prompt', (data) => {
        if (!data) return;
        if (isGalleryMode && data.session === sessionId && data.promptIndex !== currentPromptIndex) {
            currentPromptIndex = data.promptIndex;
            displayPrompt(currentPromptIndex);
        }
    });
    
    // Event listeners
    function initializeEventListeners() {
        if (promptEditor) {
            promptEditor.addEventListener('input', () => {
                if (isGalleryMode) return; // Don't allow editing in gallery mode
                
                // Emit text update for every keystroke for real-time sync
                socket.emit('text-update', {
                    text: promptEditor.value,
                    session: sessionId
                });
            });
        }
        
        if (saveButton) saveButton.addEventListener('click', savePrompt);
        if (prevButton) prevButton.addEventListener('click', showPreviousPrompt);
        if (nextButton) nextButton.addEventListener('click', showNextPrompt);
        if (galleryToggle) galleryToggle.addEventListener('click', toggleGalleryMode);
        if (rotationTimeInput) rotationTimeInput.addEventListener('change', updateRotationTime);
        
    }

    function updateRotationTime(event) {
        rotationTime = parseInt(event.target.value) || 5;
        if (isGalleryMode) {
            stopAutoRotation();
            startAutoRotation();
        }
    }

    // Initialize event listeners
    initializeEventListeners();
    
    // Functions
    async function loadPrompts() {
        try {
            const response = await fetch(`${API_URL}/prompts`);
            prompts = await response.json();
            if (galleryContent) {
                updateGallery();
            }
        } catch (error) {
            console.error('Error loading prompts:', error);
        }
    }

    async function savePromptEdit(promptId, newContent) {
        try {
            const response = await fetch(`${API_URL}/prompts/${promptId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: newContent
                })
            });

            if (response.ok) {
                loadPrompts();
            } else {
                console.error('Error al guardar el prompt');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
    
    async function savePrompt() {
        const content = promptEditor.value.trim();
        
        if (!content) {
            return; // Don't save empty prompts
        }
        
        try {
            const response = await fetch(`${API_URL}/prompts`, {
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
        if (!galleryContent) return;
        galleryContent.innerHTML = '';
        
        prompts.forEach((prompt, index) => {
            const promptElement = document.createElement('div');
            promptElement.className = 'prompt-item';
            if (index === currentPromptIndex) {
                promptElement.classList.add('active');
            }
            
            // Crear texto del prompt (editable)
            const promptText = document.createElement('span');
            promptText.className = 'prompt-text';
            promptText.contentEditable = true;
            promptText.textContent = prompt.content;
            
            // Manejar edición inline
            promptText.addEventListener('focus', () => {
                promptElement.classList.add('editing');
            });
            
            promptText.addEventListener('blur', () => {
                promptElement.classList.remove('editing');
                if (promptText.textContent !== prompt.content) {
                    savePromptEdit(prompt._id, promptText.textContent);
                }
            });
            
            // Crear botón de borrar (X)
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.innerHTML = '×';
            deleteButton.onclick = (e) => {
                e.stopPropagation();
                deletePrompt(prompt._id, index);
            };
            
            // Agregar elementos al contenedor
            promptElement.appendChild(promptText);
            promptElement.appendChild(deleteButton);
            
            // Activar prompt al hacer click
            promptElement.addEventListener('click', (e) => {
                if (e.target === promptText || e.target === deleteButton) return; // No activar si está editando o borrando
                e.preventDefault();
                e.stopPropagation();
                selectPrompt(index);
                loadSelectedPrompt();
            });
            
            galleryContent.appendChild(promptElement);
        });
        
        updateCounter();
        if (prevButton) prevButton.disabled = currentPromptIndex <= 0;
        if (nextButton) nextButton.disabled = currentPromptIndex >= prompts.length - 1 || currentPromptIndex === -1;
    }
    
    function selectPrompt(index) {
        currentPromptIndex = index;
        updateGallery();
    }
    
    function loadSelectedPrompt() {
        if (currentPromptIndex >= 0 && currentPromptIndex < prompts.length) {
            const selectedPrompt = prompts[currentPromptIndex];
            if (selectedPrompt && selectedPrompt.content !== undefined) {
                promptEditor.value = selectedPrompt.content;
                socket.emit('select-prompt', { ...selectedPrompt, session: sessionId });
            }
        }
    }
    
    function showPreviousPrompt() {
        if (prompts.length > 0) {
            // Move to previous prompt or to last if at beginning
            currentPromptIndex = currentPromptIndex <= 0 ? prompts.length - 1 : currentPromptIndex - 1;
            displayPrompt(currentPromptIndex);
            
            // Notify other clients if in gallery mode
            if (isGalleryMode) {
                const currentPrompt = prompts[currentPromptIndex];
                socket.emit('rotate-prompt', { 
                    promptIndex: currentPromptIndex,
                    promptText: currentPrompt.content,
                    promptId: currentPrompt._id,
                    session: sessionId
                });
            }
        }
    }
    
    function showNextPrompt() {
        if (prompts.length > 0) {
            // Move to next prompt or back to first
            currentPromptIndex = (currentPromptIndex + 1) % prompts.length;
            displayPrompt(currentPromptIndex);
            
            // Notify other clients if in gallery mode
            if (isGalleryMode) {
                const currentPrompt = prompts[currentPromptIndex];
                socket.emit('rotate-prompt', { 
                    promptIndex: currentPromptIndex,
                    promptText: currentPrompt.content,
                    promptId: currentPrompt._id,
                    session: sessionId
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
    function setGalleryMode(isActive, promptIdx) {
        isGalleryMode = isActive;
        
        // Update UI
        updateGalleryModeUI();
        
        // Make text editor readonly in gallery mode
        promptEditor.readOnly = isGalleryMode;
        
        // Update prompt index if provided
        if (promptIdx !== undefined && promptIdx >= 0 && promptIdx < prompts.length) {
            currentPromptIndex = promptIdx;
            displayPrompt(currentPromptIndex);
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
    
    // Toggle gallery mode function
    function toggleGalleryMode() {
        setGalleryMode(!isGalleryMode, currentPromptIndex);
        
        // Notificar a otros clientes en la misma sesión
        socket.emit('gallery-mode', { 
            isActive: isGalleryMode, 
            promptIndex: currentPromptIndex,
            session: sessionId
        });
    }

    // Update UI for gallery mode
    function updateGalleryModeUI() {
        galleryToggle.textContent = `GALLERY ${isGalleryMode ? 'ON' : 'OFF'}`;
        galleryToggle.classList.toggle('active', isGalleryMode);
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
                
                // Notify others in same session
                socket.emit('rotate-prompt', {
                    promptIndex: currentPromptIndex,
                    promptText: prompts[currentPromptIndex].content,
                    promptId: prompts[currentPromptIndex]._id,
                    session: sessionId
                });
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
