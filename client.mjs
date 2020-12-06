import Client from './SocketClient.mjs';
import TestMessage, {EnumTest} from './TestMessage.mjs';

let client = new Client('ws://localhost:3000')

client.on('myMessage', (ws, msg)=>{
  if (msg instanceof TestMessage) {
    console.log(msg.toString());
  } else {
    console.log('msg was not an instance of TestMessage');
  }
})

setTimeout(()=>{
  client.emit('myMessage', new TestMessage("Another good name.", "This is a shorter description of this description.", 3.7, EnumTest.ENUM2));
}, 5000)
