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
    
    // Get APP_PATH from config
    const APP_PATH = window.APP_PATH || 'pizarraia';
    
    // Socket connection
    const socketConfig = config.getSocketConfig();
    console.log('Socket config:', socketConfig);
    const socket = io(socketConfig.url, socketConfig.options);
    
    // Variables
    let prompts = [];
    let currentPromptIndex = -1;
    let isTyping = false;
    let typingTimer;
    const TYPING_DELAY = 500; // ms delay after typing stops
    
    // Connect to socket
    socket.on('connect', () => {
        connectionStatus.textContent = 'Conectado';
        connectionStatus.classList.add('connected');
        console.log('Connected to server with ID:', socket.id);
        
        // Load prompts from database
        loadPrompts();
    });
    
    socket.on('disconnect', () => {
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.classList.remove('connected');
        console.log('Disconnected from server');
    });
    
    // Listen for text updates from other clients
    socket.on('text-update', (data) => {
        if (data.text !== promptEditor.value) {
            promptEditor.value = data.text;
        }
    });
    
    // Listen for prompt load requests
    socket.on('load-prompt', (data) => {
        promptEditor.value = data.content;
    });
    
    // Listen for new prompts added by other clients
    socket.on('new-prompt', (prompt) => {
        prompts.unshift(prompt);
        updateGallery();
    });
    
    // Event listeners
    promptEditor.addEventListener('input', () => {
        // Clear any existing timer
        clearTimeout(typingTimer);
        
        // Set typing flag
        isTyping = true;
        
        // Emit text update after typing stops
        typingTimer = setTimeout(() => {
            isTyping = false;
            socket.emit('text-update', { text: promptEditor.value });
        }, TYPING_DELAY);
    });
    
    saveButton.addEventListener('click', savePrompt);
    loadButton.addEventListener('click', loadSelectedPrompt);
    prevButton.addEventListener('click', showPreviousPrompt);
    nextButton.addEventListener('click', showNextPrompt);
    
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
            alert('El prompt no puede estar vacío');
            return;
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
            prompts.unshift(newPrompt);
            updateGallery();
            alert('Prompt guardado correctamente');
        } catch (error) {
            console.error('Error saving prompt:', error);
            alert('Error al guardar el prompt');
        }
    }
    
    function updateGallery() {
        if (prompts.length === 0) {
            galleryContent.innerHTML = '<p class="empty-gallery">No hay prompts guardados</p>';
            galleryCounter.textContent = '0/0';
            loadButton.disabled = true;
            prevButton.disabled = true;
            nextButton.disabled = true;
            return;
        }
        
        galleryContent.innerHTML = '';
        
        prompts.forEach((prompt, index) => {
            const promptItem = document.createElement('div');
            promptItem.classList.add('prompt-item');
            if (index === currentPromptIndex) {
                promptItem.classList.add('active');
            }
            
            const date = new Date(prompt.createdAt);
            const formattedDate = date.toLocaleString();
            
            promptItem.innerHTML = `
                <div class="prompt-content">${truncateText(prompt.content, 50)}</div>
                <div class="prompt-date">${formattedDate}</div>
            `;
            
            promptItem.addEventListener('click', () => {
                selectPrompt(index);
            });
            
            galleryContent.appendChild(promptItem);
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
        if (currentPromptIndex > 0) {
            currentPromptIndex--;
            updateGallery();
        }
    }
    
    function showNextPrompt() {
        if (currentPromptIndex < prompts.length - 1) {
            currentPromptIndex++;
            updateGallery();
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
});
