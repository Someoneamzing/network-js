const types = {
  'int8': {get (prop) {
    return function () {return this._backmem.getInt8(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setInt8(this._offsets[prop], val)}
  }, array: Int8Array},
  'uint8': {get (prop) {
    return function () {return this._backmem.getUint8(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setUint8(this._offsets[prop], val)}
  }, array: Uint8Array},
  'int16': {get (prop) {
    return function () {return this._backmem.getInt16(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setInt16(this._offsets[prop], val)}
  }, array: Int16Array},
  'uint16': {get (prop) {
    return function () {return this._backmem.getUint16(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setUint16(this._offsets[prop], val)}
  }, array: Uint16Array},
  'int32': {get (prop) {
    return function () {return this._backmem.getInt32(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setInt32(this._offsets[prop], val)}
  }, array: Int32Array},
  'uint32': {get (prop) {
    return function () {return this._backmem.getUint32(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setUint32(this._offsets[prop], val)}
  }, array: Uint32Array},
  'int64': {get (prop) {
    return function () {return this._backmem.getBigInt64(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setBigInt64(this._offsets[prop], val)}
  }, array: BigInt64Array},
  'uint64': {get (prop) {
    return function () {return this._backmem.getBigUint64(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setBigUint64(this._offsets[prop], val)}
  }, array: BigUint64Array},
  'float': {get (prop) {
    return function () {return this._backmem.getFloat32(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setFloat32(this._offsets[prop], val)}
  }, array: Float32Array},
  'double': {get (prop) {
    return function () {return this._backmem.getFloat64(this._offsets[prop])}
  }, set(prop) {
    return function (val) {this._backmem.setFloat64(this._offsets[prop], val)}
  }, array: Float64Array},
  'string': {get (prop) {
    return function () {
      let size = this._backmem.getUint32(this._offsets[prop]);
      return String.fromCharCode.apply(null, Array.from({length: size}, (_,i)=>this._backmem.getUint16(this._offsets[prop] + Uint32Array.BYTES_PER_ELEMENT + i * Uint16Array.BYTES_PER_ELEMENT)))
    }
  }, set(prop) {
    return function (val) {
      this._backmem.setUint32(this._offsets[prop], val.length);
      console.log(`String offset: ${this._offsets[prop] + Uint32Array.BYTES_PER_ELEMENT} length: ${val.length}. Backing buffer size: ${this._backmem.byteLength}`);
      for (let i = 0; i < val.length; i ++) this._backmem.setUint16(this._offsets[prop] + Uint32Array.BYTES_PER_ELEMENT + i * Uint16Array.BYTES_PER_ELEMENT, val.charCodeAt(i))
    }
  }},
  'raw': {
    get(prop) {
      return function() {
        let size = this._backmem.getUint32(this._offsets[prop]);
        return new Uint8Array(this._backmem.buffer, this._offsets[prop] + Uint32Array.BYTES_PER_ELEMENT, size);
      }
    },
    set(prop) {
      return function(val) {
        this._backmem.setUint32(this._offsets[prop], val.byteLength);
        new Uint8Array(this._backmem.buffer, this._offsets[prop] + Uint32Array.BYTES_PER_ELEMENT, val.byteLength).set(val,0);
      }
    }
  }
}

function writeStringToBuf(buf, offset, string) {
  buf.writeUint32(offset, string.length);
  let writeHelper = new Uint16Array(buf, offset + Uint32Array.BYTES_PER_ELEMENT);
  for (let i = 0; i < string.length; i ++) {
    writeHelper[i] = string.charCodeAt(i);
  }
}

function readStringFromBuf(buf, offset) {
  let length = buf.readUint32(buf, offset);
  return String.fromCharCode.apply(null, new Uint16Array(buf, offset + Uint32Array.BYTES_PER_ELEMENT, length))
}

const ENUM_PROCESSED = Symbol("EnumProcessed");
const ENUM_UNDER_TYPE = Symbol("EnumUnderType");
const ENUM_VAL = Symbol("EnumVal");
const ENUM_DES_MAP = Symbol("EnumDesMap");

export class Enum {
  constructor(i) {
    if (this.constructor[ENUM_PROCESSED]) throw new TypeError("Intantating Enum types is not supported. Use the property of the type class.")
    this[ENUM_VAL] = i;
  }

  static get def() {
    return [];
  }

  toString() {
    return `${this.constructor.name}.${this.constructor.def[this[ENUM_VAL]]}`
  }

  static register(enumType) {
    if (!(enumType.prototype instanceof Enum)) throw new TypeError(`Cannot register non-Enum type ${enumType.name} as Enum`);
    if (!Array.isArray(enumType.def)) throw new TypeError("enumType.def must be an array. Got " + enumType.def.name)
    if (enumType[ENUM_PROCESSED]) return;
    let type = 'uint32';
    if (enumType.def.length <= 1<<8) {
      type = 'uint8';
    } else if (enumType.def.length <= 1<<16) {
      type = 'uint16'
    }
    enumType[ENUM_UNDER_TYPE] = type;
    let def = enumType.def;
    enumType[ENUM_DES_MAP] = def.map((name, i) => {
      enumType[name] = new enumType(i);
      return enumType[name];
    })
    enumType[ENUM_PROCESSED] = true;
    enumType.deserialize = (i) => {
      return enumType[ENUM_DES_MAP][i];
    }
  }
}


export default class Message {

  constructor(...args) {
    let props = Array.from(Object.keys(this.constructor.def));
    let off = 0;
    this._offsets = props.reduce((out, prop, i)=>{
      out[prop] = off;
      switch(this.constructor.def[prop].type) {
        case 'string':
          off += Uint32Array.BYTES_PER_ELEMENT + args[i].length * 2;
          break;
        case 'raw':
          off += Uint32Array.BYTES_PER_ELEMENT + args[i].byteLength;
          break;
        case 'int8':
        case 'uint8':
        case 'int16':
        case 'uint16':
        case 'int32':
        case 'uint32':
        case 'int64':
        case 'uint64':
        case 'float':
        case 'double':
          off += types[this.constructor.def[prop].type].array.BYTES_PER_ELEMENT;
          break;
        default:
          if (this.constructor.def[prop].type.prototype instanceof Enum) {
            off += types[this.constructor.def[prop].type[ENUM_UNDER_TYPE]].array.BYTES_PER_ELEMENT;
          } else throw new TypeError(`Invalid Type '${this.constructor.def[prop].type}' for prop '${prop}'. Can be any one of 'string',${Array.from(Object.keys(types)).map(e=>`'${e}'`).join(',')} or class that extends Message.`)
      }
      return out;
    }, Object.create(null))
    this._backmem = new DataView(new ArrayBuffer(off));
    for (let i = 0; i < args.length; i ++) this[props[i]] = args[i];
  }

  get size() {
    return this._backmem.byteLength;
  }

  serialize() {return this._backmem.buffer}

  cast(type) {
    return type.deserialize(this.serialize())
  }

  static deserializeGeneral(data) {
    let helper = new DataView(data);
    console.log("Recieved ID: ", helper.getUint32(0));
    return Message.type_map.get(helper.getUint32(0)).deserialize(data.slice(Uint32Array.BYTES_PER_ELEMENT))
  }

  static serialize(obj) {
    if (obj instanceof Message) {
      console.log(obj.toString());
      let data = obj.serialize();
      let out = new ArrayBuffer(data.byteLength + Uint32Array.BYTES_PER_ELEMENT);
      let helper = new DataView(out);
      helper.setUint32(0, obj.constructor[Message.ID_SYMBOL]);
      new Uint8Array(out).set(new Uint8Array(data), Uint32Array.BYTES_PER_ELEMENT);
      return out;
    } else {
      throw new TypeError("Cannot serialize non-Message objects.")
    }
  }

  static register(type) {
    if (!type.prototype instanceof Message) throw new TypeError("Message types must inherit from the Message class")
    Object.defineProperty(type, Message.ID_SYMBOL, {
      writable: false,
      value: new Uint32Array([Array.from(type.name).reduce((hash, char)=>0 | ((hash << 5) - hash + char.charCodeAt(0)), 0)])[0]
    })
    Message.type_map.set(type[Message.ID_SYMBOL], type);
    console.log(`Registered ${type.name} as ID: ${type[Message.ID_SYMBOL]}`);
    let props = Array.from(Object.keys(type.def));


    Object.defineProperties(type.prototype, props.reduce((out,prop)=>{
      let get , set;
      if (type.def[prop].type.prototype instanceof Enum) {
        let reader = types[type.def[prop].type[ENUM_UNDER_TYPE]].get(prop);
        let writer = types[type.def[prop].type[ENUM_UNDER_TYPE]].set(prop);
        get = function(){
          return type.def[prop].type.deserialize(reader.call(this))
        }
        set = function(val){
          if (!(val instanceof type.def[prop].type) && isNaN(val)) throw new TypeError(`Error setting ${prop} on ${type.name}: The provided value must be an instance of ${type.def[prop].type.name}`)
          console.log(`Setting to ${val.toString()}`);
          writer.call(this, val instanceof type.def[prop].type?val[ENUM_VAL]:val);
        }
      } else {
        console.log(`Default type for prop ${prop}`);
        get = types[type.def[prop].type].get(prop);
        set = types[type.def[prop].type].set(prop);
      }
      out[prop] = {get, set};
      return out;
    }, Object.create(null)))
    type.deserialize = function (data){
      data = new DataView(data instanceof ArrayBuffer ? data : data.buffer);
      let off = 0;
      let args = [];
      for (let prop of Object.keys(type.def)) {
        let length;
        switch(type.def[prop].type) {
          case 'string':
            length = data.getUint32(off);
            off += Uint32Array.BYTES_PER_ELEMENT;
            let string = String.fromCharCode.apply(null, Array.from({length}, (_,i)=>data.getUint16(off + i * Uint16Array.BYTES_PER_ELEMENT)))
            off += length * Uint16Array.BYTES_PER_ELEMENT;
            args.push(string);
            break;
          case 'raw':
            length = data.getUint32(off);
            off += Uint32Array.BYTES_PER_ELEMENT;
            let buf = new Uint8Array(data.buffer, off, length);
            off += length;
            args.push(buf);
            break;
          case 'int8':
            args.push(data.getInt8(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'uint8':
            args.push(data.getUint8(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'int16':
            args.push(data.getInt16(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'uint16':
            args.push(data.getUint16(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'int32':
            args.push(data.getInt32(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'uint32':
            args.push(data.getUint32(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'int64':
            args.push(data.getBigInt64(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'uint64':
            args.push(data.getBigUint64(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'float':
            args.push(data.getFloat32(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          case 'double':
            args.push(data.getFloat64(off));
            off += types[type.def[prop].type].array.BYTES_PER_ELEMENT;
            break;
          default:
            if (type.def[prop].type.prototype instanceof Enum) {
              let reader = {'uint8': 'getUint8', 'uint16': 'getUint16', 'uint32': 'getUint32'}[type.def[prop].type[ENUM_UNDER_TYPE]]
              args.push(data[reader](off));
              off += types[type.def[prop].type[ENUM_UNDER_TYPE]].array.BYTES_PER_ELEMENT;
            } else throw new TypeError(`Invalid Type '${type.def[prop].type}' for prop '${prop}'. Can be any one of 'string',${Array.from(Object.keys(types)).map(e=>`'${e}'`).join(',')} or class that extends Message.`)
        }
      }
      return new type(...args);
    }
    // for (let prop in type.def) {
    // }
  }

  toString() {
    return `${this.constructor.name}(${Array.from(Object.keys(this.constructor.def)).map(prop=>`${prop}=${this[prop]}`).join(', ')})`
  }
}

Message.type_map = new Map();

Message.ID_SYMBOL = Symbol("Message ID");
