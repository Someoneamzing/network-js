import Message from './Message.mjs';
import Common from './SocketCommon.mjs';

export default class Client extends Common {
  constructor(url) {
    super();
    this.url = new URL(url, 'ws://localhost');
    this.url.protocol = "ws:";
    console.log(this.url.href);
    this.ws = new WebSocket(this.url.href);
    this.ws.binaryType = 'arraybuffer';
    this.ws.addEventListener('open', (...args)=>{
      console.log("WS connected");
      this.emit('open', ...args);
    })
    this.handler = this.messageHandler(this.ws);
    this.ws.addEventListener('message', (event)=> this.handler(event.data))
    this.ws.addEventListener('error', (...args)=>this.emit('error', ...args));
    this.ws.addEventListener('close', (...args)=>this.emit('close', ...args));
  }

  send(...args) {
    this.ws.send(...args);
  }
}
