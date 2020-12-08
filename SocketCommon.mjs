import Message from './Message.mjs';

export default class Common {
  constructor() {
    this.listeners = new Map();
    // this.messageHandler = this.messageHandler.bind(this);
  }

  messageHandler(ws) { return (msg)=>{
      let channel, data;
      if (msg instanceof ArrayBuffer) {
        console.log(msg);
        let helper = new DataView(msg);
        let length = helper.getUint32(1);
        channel = String.fromCharCode.apply(null, Array.from({length}, (_,i)=>helper.getUint16(1 + Uint32Array.BYTES_PER_ELEMENT + i * Uint16Array.BYTES_PER_ELEMENT)));
        if (helper.getUint8(0) == Common.TYPE_RAW) {
          //This is raw data.
          data = new Uint8Array(msg, 1 + Uint32Array.BYTES_PER_ELEMENT + length * Uint16Array.BYTES_PER_ELEMENT);
        } else if (helper.getUint8(0) == Common.TYPE_MESSAGE) {
          data = Message.deserializeGeneral(msg.slice(1 + Uint32Array.BYTES_PER_ELEMENT + length * Uint16Array.BYTES_PER_ELEMENT));
        } else {
          throw new Error('Recieved malformed packet. Unknown header type ' + helper.getUint8(0).toString(16))
        }
      } else if ( typeof msg === 'string' ) {
        let i = 0;
        loop:
        while (i < msg.length) {
          switch (msg[i]){
            case "\\": i += 2; break;
            case "#": break loop;
            default: i ++;
          }
        }
        if (i < msg.length) {
          channel = msg.substring(0, i);
          data = msg.substring(i+1, ArrayBuffer.from(msg, e=>e.charCodeAt(0)).length);
        } else {
          throw new Error('Recieved malformed string message. Missing channel name delimiter.')
        }
      } else {
        throw new TypeError("Unknown message type " + msg.constructor.name);
      }
      if (this.listeners.has(channel)) {
        for (let listener of this.listeners.get(channel)) {
          listener(ws, data);
          if (listener[Common.ONCE_SYMBOL]) this.listeners.get(channel).delete(listener);
        }
      } else {
        console.warn(`Recieved message for unbound channel '${channel}'.`);
      }
    }
  }

  emit(channel, message) {
    if (typeof channel !== 'string') throw new TypeError('channel must be a String.')
    if (message instanceof Message) {
      let serial = Message.serialize(message);
      let data = new ArrayBuffer(1 +  Uint32Array.BYTES_PER_ELEMENT + channel.length * Uint16Array.BYTES_PER_ELEMENT + serial.byteLength);
      let view = new DataView(data);
      view.setUint8(0, Common.TYPE_MESSAGE);
      view.setUint32(1, channel.length);
      let helper = new Uint8Array(data);
      let string = Uint16Array.from(channel, c=>c.charCodeAt(0));
      for (let i = 0; i < string.length; i ++) view.setUint16(1 + Uint32Array.BYTES_PER_ELEMENT + i * Uint16Array.BYTES_PER_ELEMENT, string[i]);
      // helper.set(string, 1 + Uint32Array.BYTES_PER_ELEMENT);
      helper.set(new Uint8Array(serial), 1 + Uint32Array.BYTES_PER_ELEMENT + string.byteLength);
      this.send(data, {binary: true});
      return;
    }
    if (ArrayBuffer.isView(message)) message = message.buffer;
    if (message instanceof ArrayBuffer) {
      let data = new ArrayBuffer(message.byteLength + 1);
      new DataView(data).setUint8(0, Common.TYPE_RAW);
      new Uint8Array(data).set(new Uint8Array(message), 1);
      this.send(data, {binary: true});
    } else if (typeof message === 'string') {
      message = `${channel.replace(/\\/g, '\\\\').replace(/#/g, "\\#")}#${message}`;
      this.send(message)
    } else {
      throw new TypeError('Only string, raw binary or Message objects are allowed as a message.');
    }
  }

  on(channel, fn) {
    if (typeof channel !== 'string') throw new TypeError('channel must be a String.')
    if (typeof fn !== 'function') throw new TypeError('fn must be a function.');
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel).add(fn);
    fn[Common.ONCE_SYMBOL] = false;
  }

  off(channel, fn) {
    if (typeof channel !== 'string') throw new TypeError('channel must be a String.')
    if (typeof fn !== 'function') throw new TypeError('fn must be a function.');
    if (this.listeners.has(channel)) this.listeners.get(channel).delete(fn);
  }

  once(channel, fn) {
    if (typeof channel !== 'string') throw new TypeError('channel must be a String.')
    if (typeof fn !== 'function') throw new TypeError('fn must be a function.');
    if (!this.listeners.has(channel)) this.listeners.set(channel, new Set());
    this.listeners.get(channel).add(fn);
    fn[Common.ONCE_SYMBOL] = true;
  }
};

Common.TYPE_RAW = 0x00;
Common.TYPE_MESSAGE = 0xFF;

Common.ONCE_SYMBOL = Symbol("Once");
