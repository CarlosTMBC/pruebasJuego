import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";

const MAP_SIZE = 600;

function createPhaserGame(socket, codigo, setEstado) {
  let jugador = null, sprites = {};

  return new Phaser.Game({
    type: Phaser.AUTO,
    width: MAP_SIZE,
    height: MAP_SIZE,
    parent: "phaser-canvas",
    scene: {
      preload() {
        this.load.image('player', 'https://i.imgur.com/zR2H9j2.png');
        this.load.image('dead', 'https://i.imgur.com/7AFos3v.png');
      },
      create() {
        socket.on('actualizarJugadores', jugadores => {
          for (let s in sprites) sprites[s].destroy();
          sprites = {};
          jugadores.forEach(j => {
            sprites[j.id] = this.add.image(j.x, j.y, j.vivo ? 'player' : 'dead').setScale(0.08);
            if (j.id === socket.id) jugador = j;
          });
        });
        socket.on('actualizarJugador', ({ id, x, y }) => {
          if (sprites[id]) {
            sprites[id].setPosition(x, y);
          }
        });
        socket.on('jugadorEliminado', id => {
          if (sprites[id]) sprites[id].setTexture('dead');
          if (id === socket.id) alert("¡Estás fuera!");
        });
        socket.on('iniciarPartida', () => setEstado("jugando"));
        socket.on('finPartida', id => {
          if (id === socket.id) alert("¡Ganaste!");
          else alert("Ganó otro jugador.");
          setEstado("lobby");
        });

        this.input.keyboard.on('keydown', (event) => {
          if (!jugador || !jugador.vivo) return;
          let dx = 0, dy = 0;
          if (event.key === 'ArrowUp') dy = -10;
          if (event.key === 'ArrowDown') dy = 10;
          if (event.key === 'ArrowLeft') dx = -10;
          if (event.key === 'ArrowRight') dx = 10;
          if (dx || dy) {
            jugador.x += dx; jugador.y += dy;
            socket.emit('mover', { codigo, x: jugador.x, y: jugador.y });
            sprites[jugador.id].setPosition(jugador.x, jugador.y);
          }
        });

        this.input.on('pointerdown', (pointer) => {
          // Dispara al jugador más cercano (ejemplo tonto)
          let target = null, minDist = 9999;
          for (let id in sprites) {
            if (id !== socket.id && sprites[id].texture.key === 'player') {
              const dx = sprites[id].x - jugador.x, dy = sprites[id].y - jugador.y;
              const dist = Math.sqrt(dx*dx+dy*dy);
              if (dist < minDist && dist < 60) { // solo si está cerca
                minDist = dist; target = id;
              }
            }
          }
          if (target) socket.emit('disparar', { codigo, objetivoId: target });
        });
      }
    }
  });
}

export default function Game({ socket, codigo }) {
  const phaserRef = useRef();
  const [estado, setEstado] = useState("lobby");

  useEffect(() => {
    if (!phaserRef.current) {
      phaserRef.current = createPhaserGame(socket, codigo, setEstado);
    }
    // Limpieza al desmontar
    return () => {
      if (phaserRef.current) {
        phaserRef.current.destroy(true);
        phaserRef.current = null;
      }
    };
  }, [socket, codigo]);

  return (
    <div>
      <h3>Código de sala: {codigo}</h3>
      {estado === "lobby" && (
        <button onClick={() => socket.emit('iniciar', codigo)}>Iniciar Partida</button>
      )}
      <div id="phaser-canvas"></div>
    </div>
  );
}
