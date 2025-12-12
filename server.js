const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Configuración optimizada para muchos usuarios
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 30000,
    maxHttpBufferSize: 1e6, // 1 MB
    transports: ['websocket', 'polling']
});
const path = require('path');

// Servir archivos estáticos
app.use(express.static(__dirname));

// Health check endpoint (útil para monitoreo)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        activeRooms: rooms.size,
        totalViewers: Array.from(rooms.values()).reduce((sum, room) => sum + room.viewers.size, 0)
    });
});

// Almacenar información de las salas
const rooms = new Map();

// Estructura de cada sala: 
// {
//   viewers: Set(),
//   participants: [],
//   winners: [],
//   currentDisplay: ''
// }

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);
    
    // Unirse a una sala
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        // Inicializar sala si no existe
        if (!rooms.has(roomId)) {
            rooms.set(roomId, { 
                viewers: new Set(),
                participants: [],
                winners: [],
                currentDisplay: ''
            });
        }
        
        // Agregar espectador
        rooms.get(roomId).viewers.add(socket.id);
        
        // Enviar conteo de espectadores
        const viewersCount = rooms.get(roomId).viewers.size;
        io.to(roomId).emit('viewers-count', viewersCount);
        
        console.log(`Usuario ${socket.id} se unió a sala ${roomId}. Total espectadores: ${viewersCount}`);
    });
    
    // Solicitar estado actual (para espectadores que se unen tarde)
    socket.on('request-current-state', (roomId) => {
        console.log(`📨 ${socket.id} solicita estado de sala ${roomId}`);
        if (rooms.has(roomId)) {
            const room = rooms.get(roomId);
            console.log(`📦 Enviando estado: ${room.participants.length} participantes, ${room.winners.length} ganadores`);
            socket.emit('current-state', {
                participants: room.participants,
                winners: room.winners,
                currentDisplay: room.currentDisplay
            });
        } else {
            console.log(`⚠️ Sala ${roomId} no existe, enviando estado vacío`);
            socket.emit('current-state', {
                participants: [],
                winners: [],
                currentDisplay: ''
            });
        }
    });
    
    // Sincronizar estado desde admin
    socket.on('sync-state', (data) => {
        console.log(`🔄 Sincronizando estado en sala: ${data.room}`);
        console.log(`   📊 ${data.participants?.length || 0} participantes`);
        console.log(`   🏆 ${data.winners?.length || 0} ganadores`);
        if (rooms.has(data.room)) {
            rooms.get(data.room).participants = data.participants || [];
            rooms.get(data.room).winners = data.winners || [];
        }
    });
    
    // Iniciar rifa
    socket.on('start-raffle', (data) => {
        console.log('Iniciando rifa en sala:', data.room);
        socket.to(data.room).emit('raffle-started', {
            participants: data.participants,
            winnerId: data.winnerId
        });
    });
    
    // Completar rifa
    socket.on('complete-raffle', (data) => {
        console.log('Rifa completada en sala:', data.room);
        socket.to(data.room).emit('raffle-completed', {
            winner: data.winner
        });
    });
    
    // Actualizar participantes
    socket.on('update-participants', (data) => {
        console.log('Actualizando participantes en sala:', data.room);
        
        // Guardar en servidor
        if (rooms.has(data.room)) {
            rooms.get(data.room).participants = data.participants;
        }
        
        socket.to(data.room).emit('participants-updated', {
            participants: data.participants
        });
    });
    
    // Actualizar ganadores
    socket.on('update-winners', (data) => {
        console.log('Actualizando ganadores en sala:', data.room);
        
        // Guardar en servidor
        if (rooms.has(data.room)) {
            rooms.get(data.room).winners = data.winners;
        }
        
        socket.to(data.room).emit('winners-updated', {
            winners: data.winners
        });
    });
    
    // Mostrar modal de ganador
    socket.on('show-winner-modal', (data) => {
        console.log('Mostrando modal de ganador en sala:', data.room);
        socket.to(data.room).emit('show-winner-modal', {
            winner: data.winner
        });
    });
    
    // Cerrar modal de ganador
    socket.on('close-winner-modal', (data) => {
        console.log('Cerrando modal de ganador en sala:', data.room);
        socket.to(data.room).emit('close-winner-modal');
    });
    
    // Desconexión
    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
        
        // Remover de todas las salas
        rooms.forEach((room, roomId) => {
            if (room.viewers.has(socket.id)) {
                room.viewers.delete(socket.id);
                const viewersCount = room.viewers.size;
                io.to(roomId).emit('viewers-count', viewersCount);
                
                // Limpiar sala si está vacía
                if (room.viewers.size === 0) {
                    rooms.delete(roomId);
                }
            }
        });
    });
});

const PORT = process.env.PORT || 3000;

http.listen(PORT, () => {
    console.log(`🚀 Servidor Socket.IO corriendo en puerto ${PORT}`);
    console.log(`📡 Abre http://localhost:${PORT} para ver la aplicación`);
});

// Keep-alive: Prevenir que Railway duerma la aplicación
setInterval(() => {
    const timestamp = new Date().toISOString();
    console.log(`💓 Keep-alive ping: ${timestamp} | Salas activas: ${rooms.size}`);
}, 10 * 60 * 1000); // Cada 10 minutos