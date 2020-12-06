import Message, {Enum} from './Message.mjs';

export class EnumTest extends Enum {
  static get def() {
    return [
      "ENUM1",
      "ENUM2",
      "ENUM3"
    ]
  }
}

Enum.register(EnumTest)

export default class TestMessage extends Message {
  static get def(){
    return {
      name: {type: 'string'},
      description: {type: 'string'},
      rating: {type: 'float'},
      enumTest: {type: EnumTest}
    }
  }
}

Message.register(TestMessage);
