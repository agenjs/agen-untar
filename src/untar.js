import UntarStream from "./UntarStream.js";
import newPaxHeaderReader from "./newPaxHeaderReader.js";

export default async function* untar(arrayBuffer) {
  const stream = new UntarStream(arrayBuffer);
  let readGlobalPaxHeader;

  const hasNext = () => stream.position() + 4 < stream.size() && stream.peekUint32() !== 0;

  const readNextFile = () => {
    let file = {};
    let isHeaderFile = false;
    let readPaxHeader;

    const headerBeginPos = stream.position();
    const dataBeginPos = headerBeginPos + 512;

    // Read header
    file.name = stream.readString(100);
    file.mode = stream.readString(8);
    file.uid = parseInt(stream.readString(8));
    file.gid = parseInt(stream.readString(8));
    file.size = parseInt(stream.readString(12), 8);
    file.mtime = parseInt(stream.readString(12), 8);
    file.checksum = parseInt(stream.readString(8));
    file.type = stream.readString(1);
    file.linkname = stream.readString(100);
    file.ustarFormat = stream.readString(6);

    if (file.ustarFormat.indexOf("ustar") > -1) {
      file.version = stream.readString(2);
      file.uname = stream.readString(32);
      file.gname = stream.readString(32);
      file.devmajor = parseInt(stream.readString(8));
      file.devminor = parseInt(stream.readString(8));
      file.namePrefix = stream.readString(155);

      if (file.namePrefix.length > 0) {
        file.name = file.namePrefix + "/" + file.name;
      }
    }

    stream.position(dataBeginPos);

    // Derived from https://www.mkssoftware.com/docs/man4/pax.4.asp
    // and https://www.ibm.com/support/knowledgecenter/en/SSLTBW_2.3.0/com.ibm.zos.v2r3.bpxa500/pxarchfm.htm
    switch (file.type) {
      case "0": // Normal file is either "0" or "\0".
      case "": // In case of "\0", readString returns an empty string, that is "".
        file.buffer = stream.readBuffer(file.size);
        break;
      case "1": // Link to another file already archived
        // TODO Should we do anything with these?
        break;
      case "2": // Symbolic link
        // TODO Should we do anything with these?
        break;
      case "3": // Character special device (what does this mean??)
        break;
      case "4": // Block special device
        break;
      case "5": // Directory
        break;
      case "6": // FIFO special file
        break;
      case "7": // Reserved
        break;
      case "g": // Global PAX header
        isHeaderFile = true;
        readGlobalPaxHeader = newPaxHeaderReader(stream.readBuffer(file.size));
        break;
      case "x": // PAX header
        isHeaderFile = true;
        readPaxHeader = newPaxHeaderReader(stream.readBuffer(file.size));
        break;
      default: // Unknown file type
        break;
    }

    if (file.buffer === undefined) {
      file.buffer = new ArrayBuffer(0);
    }

    let dataEndPos = dataBeginPos + file.size;

    // File data is padded to reach a 512 byte boundary; skip the padded bytes too.
    if (file.size % 512 !== 0) {
      dataEndPos += 512 - (file.size % 512);
    }

    stream.position(dataEndPos);

    if (isHeaderFile) {
      file = readNextFile();
    }

    readGlobalPaxHeader && readGlobalPaxHeader(file);
    readPaxHeader &&  readPaxHeader(file);

    return {
      path : file.name,
      async* content() {
        yield file.buffer;
      },
      size : file.size,
      modified : new Date(file.mtime),
      mode : file.mode,
      uid : file.uid,
      gid : file.gid
    };
  }

  while (hasNext()) {
    yield readNextFile();
  }
}