export default function newPaxHeaderReader(buffer) {
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

