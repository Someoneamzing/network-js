import WebSocket from 'ws';
import Message from './Message.mjs';
import Common from './SocketCommon.mjs';

export default class Server extends Common {
  constructor(port, options) {
    super();
    this.port = port;
    this.wss = new WebSocket.Server({
      port,
    });
    this.listeners = new Map();

    this.wss.on('connection', (ws)=>{
      ws.binaryType = 'arraybuffer';
      ws.on('message', this.messageHandler(ws))
    })
  }

  send(...args) {
    for (let ws of this.wss.clients) ws.send(...args);
  }
}
