// Estado de la aplicación
let participants = [];
let winners = [];
let socket = null;
let isViewMode = false;
let roomId = null;

// Elementos del DOM
const nameInput = document.getElementById('nameInput');
const gerenciaInput = document.getElementById('gerenciaInput');
const csvInput = document.getElementById('csvInput');
const addBtn = document.getElementById('addBtn');
const raffleBtn = document.getElementById('raffleBtn');
const clearBtn = document.getElementById('clearBtn');
const participantsList = document.getElementById('participantsList');
const winnersList = document.getElementById('winnersList');
const winnerDisplay = document.getElementById('winnerDisplay');
const totalCount = document.getElementById('totalCount');
const totalCountMain = document.getElementById('totalCountMain');
const totalCountCollapsed = document.getElementById('totalCountCollapsed');
const showQRBtn = document.getElementById('showQRBtn');
const viewModeBtn = document.getElementById('viewModeBtn');
const qrModal = document.getElementById('qrModal');
const closeQRBtn = document.getElementById('closeQRBtn');
const copyUrlBtn = document.getElementById('copyUrlBtn');
const connectionStatus = document.getElementById('connectionStatus');
const viewersCount = document.getElementById('viewersCount');
const winnerModal = document.getElementById('winnerModal');
const winnerModalName = document.getElementById('winnerModalName');
const winnerModalGerencia = document.getElementById('winnerModalGerencia');
const continueBtn = document.getElementById('continueBtn');
const toggleParticipantsBtn = document.getElementById('toggleParticipantsBtn');
const participantsPanel = document.getElementById('participantsPanel');
const toggleIcon = document.getElementById('toggleIcon');

// Cargar datos del localStorage al iniciar
window.addEventListener('DOMContentLoaded', () => {
    loadFromLocalStorage();
    updateUI();
    initializeSocket();
    checkViewMode();
});

// Inicializar Socket.IO
function initializeSocket() {
    // Detectar automáticamente si estamos en desarrollo o producción
    const SOCKET_SERVER = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : window.location.origin;
    
    try {
        socket = io(SOCKET_SERVER, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        
        socket.on('connect', () => {
            connectionStatus.innerHTML = '🟢 Conectado';
            connectionStatus.className = 'text-xs text-green-500';
            
            // Obtener o crear room ID
            if (!roomId) {
                roomId = localStorage.getItem('roomId') || generateRoomId();
                localStorage.setItem('roomId', roomId);
            }
            
            console.log('🔌 Conectado al servidor');
            console.log('🏠 Room ID:', roomId);
            console.log('👁️ Modo View:', isViewMode);
            
            socket.emit('join-room', roomId);
            
            // Si es modo view, solicitar estado actual
            if (isViewMode) {
                console.log('📨 Solicitando estado actual...');
                socket.emit('request-current-state', roomId);
            } else {
                // Si es admin, enviar estado actual al servidor
                console.log('📤 Sincronizando estado como admin...');
                socket.emit('sync-state', {
                    room: roomId,
                    participants: participants,
                    winners: winners
                });
            }
        });
        
        socket.on('disconnect', () => {
            connectionStatus.innerHTML = '🔴 Desconectado';
            connectionStatus.className = 'text-xs text-red-500';
        });
        
        socket.on('viewers-count', (count) => {
            viewersCount.innerHTML = `👥 ${count} espectador${count !== 1 ? 'es' : ''}`;
        });
        
        // Escuchar eventos de la rifa
        socket.on('raffle-started', (data) => {
            if (isViewMode) {
                participants = data.participants;
                performRaffleViewer(data.winnerId);
            }
        });
        
        socket.on('raffle-completed', (data) => {
            if (isViewMode) {
                selectFinalWinnerViewer(data.winner);
            }
        });
        
        socket.on('participants-updated', (data) => {
            if (isViewMode) {
                participants = data.participants;
                updateUI();
            }
        });
        
        socket.on('winners-updated', (data) => {
            if (isViewMode) {
                winners = data.winners;
                updateUI();
            }
        });
        
        socket.on('show-winner-modal', (data) => {
            if (isViewMode) {
                showWinnerModal(data.winner);
            }
        });
        
        socket.on('close-winner-modal', () => {
            if (isViewMode) {
                winnerModal.classList.add('hidden');
            }
        });
        
        // Recibir estado actual (para nuevos espectadores)
        socket.on('current-state', (data) => {
            console.log('📦 Estado recibido del servidor:', data);
            if (isViewMode) {
                participants = data.participants || [];
                winners = data.winners || [];
                console.log('✅ Actualizando UI con:', participants.length, 'participantes y', winners.length, 'ganadores');
                updateUI();
                
                // Si hay un display del ganador actual, mostrarlo
                if (data.currentDisplay) {
                    winnerDisplay.innerHTML = data.currentDisplay;
                }
            } else {
                console.log('⚠️ Estado recibido pero no estamos en modo view');
            }
        });
        
    } catch (error) {
        console.error('Error al conectar con Socket.IO:', error);
        connectionStatus.innerHTML = '⚪ Modo local (sin servidor)';
        connectionStatus.className = 'text-xs text-gray-400';
    }
}

// Generar ID único para la sala
function generateRoomId() {
    return 'room_' + Math.random().toString(36).substr(2, 9);
}

// Verificar si está en modo visualización
function checkViewMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const roomParam = urlParams.get('room');
    
    if (viewParam === 'true') {
        isViewMode = true;
        document.body.classList.add('view-only');
        if (showQRBtn) showQRBtn.style.display = 'none';
        if (viewModeBtn) viewModeBtn.style.display = 'none';
        
        // IMPORTANTE: Obtener roomId de la URL
        if (roomParam) {
            roomId = roomParam;
            console.log('Modo view activado con room:', roomId);
        }
    }
}

// Mostrar QR Code
showQRBtn.addEventListener('click', () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const viewUrl = `${baseUrl}?view=true&room=${roomId}`;
    
    // Limpiar QR anterior
    const qrcodeContainer = document.getElementById('qrcode');
    qrcodeContainer.innerHTML = '';
    
    // Generar nuevo QR con QRCode.js
    try {
        new QRCode(qrcodeContainer, {
            text: viewUrl,
            width: 250,
            height: 250,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } catch (error) {
        console.error('Error generando QR:', error);
        showNotification('Error al generar QR', 'error');
        return;
    }
    
    document.getElementById('shareUrl').textContent = viewUrl;
    qrModal.classList.remove('hidden');
});

// Cerrar modal QR
closeQRBtn.addEventListener('click', () => {
    qrModal.classList.add('hidden');
});

// Copiar URL
copyUrlBtn.addEventListener('click', () => {
    const url = document.getElementById('shareUrl').textContent;
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Link copiado al portapapeles', 'success');
    });
});

// Cambiar a modo visualización
viewModeBtn.addEventListener('click', () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const viewUrl = `${baseUrl}?view=true&room=${roomId}`;
    window.open(viewUrl, '_blank');
});

// Toggle panel de participantes
toggleParticipantsBtn.addEventListener('click', () => {
    const isHidden = participantsPanel.classList.contains('hidden');
    
    if (isHidden) {
        participantsPanel.classList.remove('hidden');
        toggleIcon.style.transform = 'rotate(180deg)';
    } else {
        participantsPanel.classList.add('hidden');
        toggleIcon.style.transform = 'rotate(0deg)';
    }
});

// Procesar archivo CSV
csvInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const text = event.target.result;
            const lines = text.split('\n');
            let added = 0;
            let duplicates = 0;
            
            lines.forEach((line, index) => {
                if (index === 0) return; // Saltar encabezado si existe
                
                const parts = line.split(';').map(p => p.trim());
                if (parts.length >= 2 && parts[1]) {
                    const no = parts[0];
                    const name = parts[1];
                    const gerencia = parts[2] || 'Sin gerencia';
                    
                    // Verificar duplicado
                    if (!participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
                        participants.push({
                            id: Date.now() + added,
                            no: no,
                            name: name,
                            gerencia: gerencia,
                            addedAt: new Date().toISOString()
                        });
                        added++;
                    } else {
                        duplicates++;
                    }
                }
            });
            
            saveToLocalStorage();
            updateUI();
            
            // Emitir actualización
            if (socket && socket.connected) {
                socket.emit('update-participants', {
                    room: roomId,
                    participants: participants
                });
            }
            
            let message = `${added} participantes agregados`;
            if (duplicates > 0) {
                message += ` (${duplicates} duplicados omitidos)`;
            }
            showNotification(message, 'success');
            
            // Limpiar input
            csvInput.value = '';
            
        } catch (error) {
            showNotification('Error al procesar el archivo CSV', 'error');
            console.error(error);
        }
    };
    
    reader.readAsText(file);
});

// Guardar en localStorage
function saveToLocalStorage() {
    localStorage.setItem('participants', JSON.stringify(participants));
    localStorage.setItem('winners', JSON.stringify(winners));
}

// Cargar desde localStorage
function loadFromLocalStorage() {
    const savedParticipants = localStorage.getItem('participants');
    const savedWinners = localStorage.getItem('winners');
    
    if (savedParticipants) {
        participants = JSON.parse(savedParticipants);
    }
    if (savedWinners) {
        winners = JSON.parse(savedWinners);
    }
}

// Agregar participante
function addParticipant() {
    const name = nameInput.value.trim();
    const gerencia = gerenciaInput.value.trim() || 'Sin gerencia';
    
    if (!name) {
        showNotification('Por favor ingresa un nombre', 'error');
        return;
    }
    
    // Verificar si ya existe
    if (participants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showNotification('Este participante ya está en la lista', 'error');
        nameInput.focus();
        return;
    }
    
    participants.push({
        id: Date.now(),
        no: participants.length + 1,
        name: name,
        gerencia: gerencia,
        addedAt: new Date().toISOString()
    });
    
    nameInput.value = '';
    gerenciaInput.value = '';
    nameInput.focus();
    
    saveToLocalStorage();
    updateUI();
    
    // Emitir actualización
    if (socket && socket.connected) {
        socket.emit('update-participants', {
            room: roomId,
            participants: participants
        });
    }
    
    showNotification('Participante agregado', 'success');
}

// Eliminar participante
function removeParticipant(id) {
    participants = participants.filter(p => p.id !== id);
    saveToLocalStorage();
    updateUI();
    
    // Emitir actualización
    if (socket && socket.connected) {
        socket.emit('update-participants', {
            room: roomId,
            participants: participants
        });
    }
    
    showNotification('Participante eliminado', 'info');
}

// Realizar sorteo
function performRaffle() {
    if (participants.length === 0) {
        showNotification('No hay participantes para el sorteo', 'error');
        return;
    }
    
    // Deshabilitar botón temporalmente
    raffleBtn.disabled = true;
    raffleBtn.innerHTML = '<span class="spinning inline-block">🎲</span> Girando ruleta...';
    
    // Calcular ganador
    const randomIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[randomIndex];
    
    // Emitir evento a todos los espectadores
    if (socket && socket.connected) {
        socket.emit('start-raffle', {
            room: roomId,
            participants: participants,
            winnerId: winner.id
        });
    }
    
    // Crear ruleta
    createWheel();
    
    // Calcular grados para que caiga en el ganador
    const degreesPerSegment = 360 / participants.length;
    const baseRotation = 360 * 5; // 5 vueltas completas
    const targetRotation = randomIndex * degreesPerSegment;
    const totalRotation = baseRotation + (360 - targetRotation) + (degreesPerSegment / 2);
    
    // Aplicar animación
    const wheel = document.getElementById('raffleWheel');
    wheel.style.setProperty('--spin-degrees', `${totalRotation}deg`);
    wheel.classList.add('wheel-spinning');
    
    // Después de 10 segundos, mostrar ganador
    setTimeout(() => {
        selectFinalWinner(winner);
        
        // Emitir evento de finalización
        if (socket && socket.connected) {
            socket.emit('complete-raffle', {
                room: roomId,
                winner: winner
            });
        }
    }, 10000);
}

// Función para espectadores que solo ven la animación
function performRaffleViewer(winnerId) {
    createWheel();
    
    const winnerIndex = participants.findIndex(p => p.id === winnerId);
    if (winnerIndex === -1) return;
    
    const degreesPerSegment = 360 / participants.length;
    const baseRotation = 360 * 5;
    const targetRotation = winnerIndex * degreesPerSegment;
    const totalRotation = baseRotation + (360 - targetRotation) + (degreesPerSegment / 2);
    
    const wheel = document.getElementById('raffleWheel');
    wheel.style.setProperty('--spin-degrees', `${totalRotation}deg`);
    wheel.classList.add('wheel-spinning');
}

// Función para mostrar ganador en espectadores
function selectFinalWinnerViewer(winner) {
    // Actualizar listas
    winners.unshift({
        id: Date.now(),
        name: winner.name,
        gerencia: winner.gerencia,
        wonAt: new Date().toISOString(),
        position: winners.length + 1
    });
    
    participants = participants.filter(p => p.id !== winner.id);
    
    // Mostrar ganador
    winnerDisplay.innerHTML = `
        <div class="winner-card text-center">
            <div class="text-6xl mb-4">🏆</div>
            <div class="text-3xl font-bold text-gray-900 mb-2">${winner.name}</div>
            <div class="text-lg text-gray-600 mb-1">${winner.gerencia}</div>
            <div class="text-sm text-gray-500 mt-3">¡Felicidades!</div>
        </div>
    `;
    
    updateUI();
    createConfetti();
}

function createWheel() {
    const colors = [
        '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#84cc16',
        '#6366f1', '#f43f5e', '#22c55e', '#eab308', '#a855f7'
    ];
    
    const numSegments = participants.length;
    const segmentAngle = 360 / numSegments;
    
    let wheelHTML = `
        <div class="wheel-container">
            <div class="wheel-pointer"></div>
            <div class="wheel" id="raffleWheel">
    `;
    
    participants.forEach((participant, index) => {
        const rotation = segmentAngle * index;
        const color = colors[index % colors.length];
        const textRotation = segmentAngle / 2; // Centrar el texto
        
        wheelHTML += `
            <div class="wheel-segment" style="
                background: ${color};
                transform: rotate(${rotation}deg);
                clip-path: polygon(
                    50% 50%, 
                    50% 0%, 
                    ${50 + 50 * Math.sin((segmentAngle * Math.PI) / 180)}% ${50 - 50 * Math.cos((segmentAngle * Math.PI) / 180)}%
                );
            ">
                <div class="wheel-segment-inner" style="transform: rotate(${textRotation}deg);">
                    <div class="wheel-text">
                        ${participant.name.length > 15 ? participant.name.substring(0, 13) + '...' : participant.name}
                    </div>
                </div>
            </div>
        `;
    });
    
    wheelHTML += `
                <div class="wheel-center">🎯</div>
            </div>
        </div>
    `;
    
    winnerDisplay.innerHTML = wheelHTML;
}

function selectFinalWinner(winner) {
    // Agregar a la lista de ganadores
    const newWinner = {
        id: Date.now(),
        name: winner.name,
        gerencia: winner.gerencia,
        wonAt: new Date().toISOString(),
        position: winners.length + 1
    };
    
    winners.unshift(newWinner);
    
    // Remover de participantes
    participants = participants.filter(p => p.id !== winner.id);
    
    // Guardar inmediatamente en localStorage
    saveToLocalStorage();
    
    // Mostrar ganador en el display principal
    winnerDisplay.innerHTML = `
        <div class="winner-card text-center">
            <div class="text-6xl mb-4">🏆</div>
            <div class="text-3xl font-bold text-gray-900 mb-2">${winner.name}</div>
            <div class="text-lg text-gray-600 mb-1">${winner.gerencia}</div>
            <div class="text-sm text-gray-500 mt-3">¡Felicidades!</div>
        </div>
    `;
    
    updateUI();
    
    // Reactivar botón
    raffleBtn.disabled = participants.length === 0;
    raffleBtn.innerHTML = '🎉 Realizar sorteo';
    
    // Mostrar modal de ganador
    showWinnerModal(winner);
    
    // Confetti effect
    createConfetti();
}

// Mostrar modal de ganador
function showWinnerModal(winner) {
    winnerModalName.textContent = winner.name;
    winnerModalGerencia.textContent = winner.gerencia;
    winnerModal.classList.remove('hidden');
    
    // Emitir a espectadores que hay un ganador
    if (socket && socket.connected) {
        socket.emit('show-winner-modal', {
            room: roomId,
            winner: winner
        });
    }
}

// Cerrar modal y continuar
continueBtn.addEventListener('click', () => {
    winnerModal.classList.add('hidden');
    showNotification('Premio entregado. Listo para siguiente sorteo', 'success');
    
    // Notificar a espectadores que se cerró el modal
    if (socket && socket.connected) {
        socket.emit('close-winner-modal', {
            room: roomId
        });
    }
});

function createConfetti() {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
    const confettiCount = 50;
    
    for (let i = 0; i < confettiCount; i++) {
        const confetti = document.createElement('div');
        confetti.style.position = 'fixed';
        confetti.style.width = '10px';
        confetti.style.height = '10px';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-10px';
        confetti.style.opacity = '1';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        confetti.style.transition = 'all 3s ease-out';
        confetti.style.zIndex = '9999';
        confetti.style.borderRadius = '2px';
        
        document.body.appendChild(confetti);
        
        setTimeout(() => {
            confetti.style.top = '100vh';
            confetti.style.opacity = '0';
            confetti.style.transform = `rotate(${Math.random() * 720}deg)`;
        }, 10);
        
        setTimeout(() => confetti.remove(), 3000);
    }
}

// Actualizar interfaz
function updateUI() {
    console.log('🔄 Actualizando UI...');
    console.log('   Participantes:', participants.length);
    console.log('   Ganadores:', winners.length);
    console.log('   Modo view:', isViewMode);
    
    // Actualizar contadores (verificar que existan)
    if (totalCount) totalCount.textContent = participants.length;
    if (totalCountMain) totalCountMain.textContent = participants.length;
    if (totalCountCollapsed) totalCountCollapsed.textContent = participants.length;
    
    // Actualizar botón de sorteo (solo si existe - admin)
    if (raffleBtn) {
        raffleBtn.disabled = participants.length === 0;
    }
    
    // Actualizar lista de participantes (solo si existe - puede estar oculta en view)
    if (participantsList) {
        if (participants.length === 0) {
            participantsList.innerHTML = `
                <div class="text-center py-8 text-gray-400 text-sm">
                    No hay participantes aún
                </div>
            `;
        } else {
            participantsList.innerHTML = participants.map(p => `
                <div class="participant-item flex items-center justify-between px-3 py-2 rounded-md group">
                    <div class="flex-1">
                        <div class="text-sm text-gray-700 font-medium">${p.name}</div>
                        <div class="text-xs text-gray-500">${p.gerencia || 'Sin gerencia'}</div>
                    </div>
                    ${!isViewMode ? `
                    <button 
                        onclick="removeParticipant(${p.id})"
                        class="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                        ✕
                    </button>
                    ` : ''}
                </div>
            `).join('');
        }
    }
    
    // Actualizar lista de ganadores
    if (winnersList) {
        if (winners.length === 0) {
            winnersList.innerHTML = `
                <div class="text-center py-8 text-gray-400 text-sm">
                    Aún no hay ganadores
                </div>
            `;
        } else {
            winnersList.innerHTML = winners.map((w, index) => `
                <div class="winner-card flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-100">
                    <div class="flex-shrink-0 w-8 h-8 bg-yellow-400 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        ${index + 1}
                    </div>
                    <div class="flex-1">
                        <div class="font-semibold text-gray-900 text-sm">${w.name}</div>
                        <div class="text-xs text-gray-600">${w.gerencia || 'Sin gerencia'}</div>
                        <div class="text-xs text-gray-500">${formatDate(w.wonAt)}</div>
                    </div>
                    <div class="text-xl">🏆</div>
                </div>
            `).join('');
        }
    }
    
    console.log('✅ UI actualizada');
}

// Limpiar todo
function clearAll() {
    if (confirm('¿Estás seguro de que quieres limpiar todo? Esta acción no se puede deshacer.')) {
        participants = [];
        winners = [];
        saveToLocalStorage();
        updateUI();
        winnerDisplay.innerHTML = `
            <div class="text-center">
                <p class="text-gray-400 text-sm">Presiona "Realizar sorteo" para girar la ruleta</p>
            </div>
        `;
        showNotification('Datos limpiados', 'info');
        
        // Notificar a espectadores
        if (socket && socket.connected) {
            socket.emit('update-participants', {
                room: roomId,
                participants: participants
            });
            socket.emit('update-winners', {
                room: roomId,
                winners: winners
            });
        }
    }
}

// Formatear fecha
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('es-GT', { 
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Mostrar notificación (simple)
function showNotification(message, type) {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium z-50 ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    }`;
    notification.textContent = message;
    notification.style.animation = 'slideIn 0.3s ease-out';
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        notification.style.transition = 'all 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Event listeners
addBtn.addEventListener('click', addParticipant);
raffleBtn.addEventListener('click', performRaffle);
clearBtn.addEventListener('click', clearAll);

nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addParticipant();
    }
});