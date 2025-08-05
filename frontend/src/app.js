import React, { useState } from "react";
import io from "socket.io-client";
import Game from "./game";

// Cambia la URL por la de tu backend Render en producción
const SOCKET_URL = "http://localhost:3001";

export default function App() {
  const [sala, setSala] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [socket, setSocket] = useState(null);

  function conectar(nuevoCodigo = null) {
    const s = io(SOCKET_URL);
    setSocket(s);
    if (nuevoCodigo) {
      s.emit("unirseSala", nuevoCodigo, (ok) => {
        if (ok) setSala(nuevoCodigo);
        else alert("No se pudo unir");
      });
    } else {
      s.emit("crearSala", (codigo) => setSala(codigo));
    }
  }

  if (sala && socket) {
    return <Game socket={socket} codigo={sala} />;
  }

  return (
    <div style={{ padding: 32 }}>
      <h2>Battle Royale 2D 🕷️</h2>
      <button onClick={() => conectar()}>Crear Sala</button>
      <br /><br />
      <input
        placeholder="Código de sala"
        value={codigo}
        onChange={e => setCodigo(e.target.value.toUpperCase())}
      />
      <button onClick={() => conectar(codigo)}>Unirse a Sala</button>
    </div>
  );
}
