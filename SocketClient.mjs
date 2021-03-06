import WebSocket from 'ws';
import Message from './Message.mjs';
import Common, {generateID} from './SocketCommon.mjs';

export default class Client extends Common {
  constructor(url) {
    super();
    this.url = new URL(url, 'ws://localhost');
    this.url.protocol = "ws:";
    this.url.searchParams.set('uid', generateID())
    console.log(this.url.href);
    this.ws = new WebSocket(this.url.href);
    this.ws.binaryType = 'arraybuffer';
    this.ws.on('open', ()=>{
      console.log("WS connected");
    })

    this.ws.on('message', this.messageHandler(this.ws))
  }

  send(...args) {
    this.ws.send(...args);
  }
}
