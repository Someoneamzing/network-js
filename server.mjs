import Server from './SocketServer.mjs';
import TestMessage, {EnumTest} from './TestMessage.mjs';

let server = new Server(3000);

server.on('myMessage', (ws, data)=>{
  if (data instanceof TestMessage) {
    console.log(data.toString());
  } else {
    console.log("Data was not an instance of TestMessage");
  }
  server.emit('myMessage', new TestMessage("A Good Name.", "A fairly long description that describes this description.", 4.5, EnumTest.ENUM3))
})
