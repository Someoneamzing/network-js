import WebSocket from 'ws';
import Message from './Message.mjs';
import Common from './SocketCommon.mjs';

export default class Server extends Common {
  constructor(port, options) {
    super();
    this.port = port;
    this.wss = new WebSocket.Server({
      port,
      clientTracking: true
    });
    this.listeners = new Map();

    this.wss.on('connection', (ws, req)=>{
      ws.binaryType = 'arraybuffer';
      ws.id = new URL(req.url).searchParams.get('uid');
      ws.on('message', this.messageHandler(ws))
      this.internalEmit('connection', ws);
    })
  }

  get clients() {
    return this.wss.clients;
  }

  send(...args) {
    for (let ws of this.wss.clients) ws.send(...args);
  }
}
