export default async function* rawUntar(it) {
  let readGlobalPaxHeader;
  let readPaxHeader;
  const readBlock = newBlockReader(it);
  const BLOCK_SIZE = 512;
  while (true) {
    const buf = await readBlock(BLOCK_SIZE);

    const blockLen = getBlockLength(buf);
    if (blockLen < 4) break ;

    const bufferView = new DataView(buf, 0, blockLen);
    if (bufferView.getUint32(0, true) === 0) break;

    const readString = newStringReader(bufferView);

    let isHeaderFile = false;

    // Read header
    let file = {};
    file.name = readString(100);
    file.mode = readString(8);
    file.uid = parseInt(readString(8));
    file.gid = parseInt(readString(8));
    file.size = parseInt(readString(12), 8);
    file.mtime = parseInt(readString(12), 8);
    file.checksum = parseInt(readString(8));
    file.type = readString(1);
    file.linkname = readString(100);
    file.ustarFormat = readString(6);

    if (file.ustarFormat.indexOf("ustar") > -1) {
      file.version = readString(2);
      file.uname = readString(32);
      file.gname = readString(32);
      file.devmajor = parseInt(readString(8));
      file.devminor = parseInt(readString(8));
      file.namePrefix = readString(155);

      if (file.namePrefix.length > 0) {
        file.name = file.namePrefix + "/" + file.name;
      }
    }

    // Derived from https://www.mkssoftware.com/docs/man4/pax.4.asp
    // and https://www.ibm.com/support/knowledgecenter/en/SSLTBW_2.3.0/com.ibm.zos.v2r3.bpxa500/pxarchfm.htm
    switch (file.type) {
      case "0": // Normal file is either "0" or "\0".
      case "": // In case of "\0", readString returns an empty string, that is "".
        file.buffer = await readBlock(file.size);
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
        readGlobalPaxHeader = newPaxHeaderReader(await readBlock(file.size));
        break;
      case "x": // PAX header
        isHeaderFile = true;
        readPaxHeader = newPaxHeaderReader(await readBlock(file.size));
        break;
      default: // Unknown file type
        break;
    }

    if (file.buffer === undefined) {
      file.buffer = new ArrayBuffer(0);
    }

    // File data is padded to reach a 512 byte boundary; skip the padded bytes too.
    const paddedBytes = file.size % BLOCK_SIZE;
    if (paddedBytes !== 0) {
      await readBlock(BLOCK_SIZE - paddedBytes);
    }


    if (isHeaderFile) {
      continue; 
    }

    readGlobalPaxHeader && readGlobalPaxHeader(file);
    readPaxHeader && readPaxHeader(file);
    readPaxHeader = null;
    yield file;
  }
}

function newStringReader(bufferView) {
  let position = 0;
  return (charCount) => {
    const charSize = 1;
    const byteCount = charCount * charSize;
    const charCodes = [];
    for (let i = 0; i < charCount; ++i) {
      const charCode = bufferView.getUint8(position + (i * charSize), true);
      if (charCode === 0) break;
      charCodes.push(charCode);
    }
    position += byteCount;
    return String.fromCharCode.apply(null, charCodes);
  }
}

async function* toIterator(o) {
  yield* o;
}

function getBlockLength(block) {
  return block.byteLength; // || block.length;
}
function newBlockReader(it) {
  it = toIterator(it);
  let block, blockLen = 0, start = 0;
  return async function(size) {
    const chunks = [];
    while (size > 0) {
      if (start < blockLen) {
        const s = Math.min(size, blockLen - start);
        const chunk = (block.subarray || block.slice).call(block, start, start + s);
        chunks.push(chunk);
        start += s;
        size -= s;
      }
      // Read the next block. It allows to successfully finish the stream.
      if (start >= blockLen) {
        block = [];
        start = 0;
        const slot = await it.next();
        if (!slot || slot.done) break;
        block = await slot.value;
        blockLen = getBlockLength(block);
      }
    }
    return await new Blob(chunks).arrayBuffer()
  }
}

function newPaxHeaderReader(buffer) {
  // https://www.ibm.com/support/knowledgecenter/en/SSLTBW_2.3.0/com.ibm.zos.v2r3.bpxa500/paxex.htm
  // An extended header shall consist of one or more records, each constructed as follows:
  // "%d %s=%s\n", <length>, <keyword>, <value>

  // The extended header records shall be encoded according to the ISO/IEC10646-1:2000 standard (UTF-8).
  // The <length> field, <blank>, equals sign, and <newline> shown shall be limited to the portable character set, as
  // encoded in UTF-8. The <keyword> and <value> fields can be any UTF-8 characters. The <length> field shall be the
  // decimal length of the extended header record in octets, including the trailing <newline>.

  let bytes = new Uint8Array(buffer);
  const fields = [];

  const decoder = new TextDecoder();
  while (bytes.length > 0) {
    // Decode bytes up to the first space character; that is the total field length
    const fieldLength = parseInt(decoder.decode(bytes.subarray(0, bytes.indexOf(0x20))));
    const fieldText = decoder.decode(bytes.subarray(0, fieldLength));
    const fieldMatch = fieldText.match(/^\d+ ([^=]+)=(.*)\n$/);

    if (fieldMatch === null) {
      throw new Error("Invalid PAX header data format.");
    }

    const fieldName = fieldMatch[1];
    let fieldValue = fieldMatch[2];

    if (fieldValue.length === 0) {
      fieldValue = null;
    } else if (fieldValue.match(/^\d+$/) !== null) {
      // If it's a integer field, parse it as int
      fieldValue = parseInt(fieldValue);
    }
    // Don't parse float values since precision is lost

    const field = {
      name: fieldName,
      value: fieldValue
    };

    fields.push(field);

    bytes = bytes.subarray(fieldLength); // Cut off the parsed field data
  }

  return (file) => {
    // Apply fields to the file
    // If a field is of value null, it should be deleted from the file
    // https://www.mkssoftware.com/docs/man4/pax.4.asp
    fields.forEach((field) => {
      let fieldName = field.name;
      const fieldValue = field.value;

      if (fieldName === "path") {
        // This overrides the name and prefix fields in the following header block.
        fieldName = "name";

        if (file.prefix !== undefined) {
          delete file.prefix;
        }
      } else if (fieldName === "linkpath") {
        // This overrides the linkname field in the following header block.
        fieldName = "linkname";
      }

      if (fieldValue === null) {
        delete file[fieldName];
      } else {
        file[fieldName] = fieldValue;
      }
    });
    return file;
  }
}

