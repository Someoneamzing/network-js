import Message from './Message.mjs';

class Test extends Message {
  static get def() {
    return {
      'a': {'type': 'uint8'},
      'b': {'type': 'string'},
      'c': {'type': 'int16'},
      'd': {'type': 'raw'},
      'e': {'type': 'uint32'},
      'f': {'type': 'float'},
    }
  }
}

Message.register(Test);

let test = new Test(23, "Hello World", 2**9, new Uint8Array([132,134,23,45,8,87,1]), 2^17, 3.141596);

console.log(test.toString());

let data = test.serialize();

console.log(data);

let testOut = Test.deserialize(data);

console.log(testOut.toString());
