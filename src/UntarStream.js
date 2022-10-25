export default class UntarStream {

  constructor(arrayBuffer) {
    this._bufferView = new DataView(arrayBuffer.buffer, 0, arrayBuffer.length);
    this._position = 0;
  }

  readString(charCount) {
    //console.log("readString: position " + this.position() + ", " + charCount + " chars");
    const charSize = 1;
    const byteCount = charCount * charSize;

    const charCodes = [];

    for (var i = 0; i < charCount; ++i) {
      var charCode = this._bufferView.getUint8(this.position() + (i * charSize), true);
      if (charCode !== 0) {
        charCodes.push(charCode);
      } else {
        break;
      }
    }

    this.seek(byteCount);

    return String.fromCharCode.apply(null, charCodes);
  }

  readBuffer(byteCount) {
    let buf;

    if (typeof ArrayBuffer.prototype.slice === "function") {
      buf = this._bufferView.buffer.slice(this.position(), this.position() + byteCount);
    } else {
      buf = new ArrayBuffer(byteCount);
      var target = new Uint8Array(buf);
      var src = new Uint8Array(this._bufferView.buffer, this.position(), byteCount);
      target.set(src);
    }

    this.seek(byteCount);
    return buf;
  }

  seek(byteCount) {
    this._position += byteCount;
  }

  peekUint32() {
    return this._bufferView.getUint32(this.position(), true);
  }

  position(newpos) {
    if (newpos === undefined) {
      return this._position;
    } else {
      this._position = newpos;
    }
  }

  size() {
    return this._bufferView.byteLength;
  }
}