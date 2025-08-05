const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let salas = {}; // código: { jugadores: [{id, x, y, vivo}], estado: 'esperando' | 'jugando' }

function crearCodigoSala() {
  return Math.random().toString(36).substr(2, 5).toUpperCase();
}

io.on('connection', (socket) => {
  // Crear sala
  socket.on('crearSala', (callback) => {
    const codigo = crearCodigoSala();
    salas[codigo] = { jugadores: [], estado: 'esperando' };
    socket.join(codigo);
    salas[codigo].jugadores.push({ id: socket.id, x: 100, y: 100, vivo: true });
    callback(codigo);
    io.to(codigo).emit('actualizarJugadores', salas[codigo].jugadores);
  });

  // Unirse a sala
  socket.on('unirseSala', (codigo, callback) => {
    if (salas[codigo] && salas[codigo].estado === 'esperando') {
      salas[codigo].jugadores.push({ id: socket.id, x: 200, y: 200, vivo: true });
      socket.join(codigo);
      callback(true);
      io.to(codigo).emit('actualizarJugadores', salas[codigo].jugadores);
    } else {
      callback(false);
    }
  });

  // Movimiento de jugador
  socket.on('mover', ({ codigo, x, y }) => {
    if (salas[codigo]) {
      const jugador = salas[codigo].jugadores.find(j => j.id === socket.id);
      if (jugador && jugador.vivo) {
        jugador.x = x; jugador.y = y;
        socket.to(codigo).emit('actualizarJugador', { id: socket.id, x, y });
      }
    }
  });

  // Disparo (al toque)
  socket.on('disparar', ({ codigo, objetivoId }) => {
    if (salas[codigo]) {
      const objetivo = salas[codigo].jugadores.find(j => j.id === objetivoId && j.vivo);
      if (objetivo) {
        objetivo.vivo = false;
        io.to(codigo).emit('jugadorEliminado', objetivoId);
        // Checa si hay un solo jugador vivo
        const vivos = salas[codigo].jugadores.filter(j => j.vivo);
        if (vivos.length === 1) {
          io.to(codigo).emit('finPartida', vivos[0].id);
          salas[codigo].estado = 'esperando';
          salas[codigo].jugadores.forEach(j => j.vivo = true); // Resetea
        }
      }
    }
  });

  socket.on('iniciar', (codigo) => {
    if (salas[codigo]) {
      salas[codigo].estado = 'jugando';
      io.to(codigo).emit('iniciarPartida');
    }
  });

  // Al desconectarse
  socket.on('disconnect', () => {
    for (let codigo in salas) {
      const sala = salas[codigo];
      const index = sala.jugadores.findIndex(j => j.id === socket.id);
      if (index !== -1) {
        sala.jugadores.splice(index, 1);
        io.to(codigo).emit('actualizarJugadores', sala.jugadores);
        if (sala.jugadores.length === 0) delete salas[codigo];
        break;
      }
    }
  });
});

app.get('/', (req, res) => res.send('Backend Battle Royale 🕷️ activo'));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log('Servidor corriendo en puerto', PORT));
