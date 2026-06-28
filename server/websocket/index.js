import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Set();

export function initWebSocket(server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log(`Cliente WS conectado. Total: ${clients.size}`);

    ws.on('close', () => {
      clients.delete(ws);
      console.log(`Cliente WS desconectado. Total: ${clients.size}`);
    });

    ws.on('error', (err) => {
      console.error('Erro no soquete WS:', err);
    });
  });

  return wss;
}

export function broadcast(event, payload) {
  if (!wss) return;

  const message = JSON.stringify({ event, payload });
  
  for (const client of clients) {
    if (client.readyState === 1) { // 1 = OPEN
      try {
        client.send(message);
      } catch (err) {
        console.error('Erro ao enviar mensagem para cliente WS:', err);
      }
    }
  }
}
