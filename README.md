@agen/untar
===========

This package contains a AsyncIterator-based untar utility methods. The main method - `untar` - provides
an asynchronous iterator over file entries stored in the archive. 
The structure of returned file instances:
* `async* content()` - return an async iterator over byte content of the file; note that this method 
  *do not* uncomress the data; use the `@agen/gzip` to inflate bytes.
* `path` - path to the file; for directories it contains the trailing `/` symbol.
* `size` - the total size of the file
* `modified` the data of the file modification
* `mode` the file mode
* `uid` user id
* `gid` group id

The code of this library is based on a rewamped implementation of the [js-untar](https://github.com/InvokIT/js-untar) package (MIT License).

Internally all values are loaded from byte arrays (like Uint8Array).

This library has no external dependencies and can be used in the browser, in Deno or in Node environmets.

`untar` method
--------------

This method returns an AsyncIterator over files in the specified archive.

Parameters:
* `iterator` - an AsyncIterator over binary blocks

Returns an AsyncGenerator over archived file entries.

Example: 
```javascript

import fs from 'fs';
import { unzip } from '@agen/untar';

const stream = fs.createReadStream('./MyArchive.tar'); // Node streams are AsyncIterator generators
const files = untar(stream); // returns an Async Generator

// Now we can decompress and read text content from files:
for await (let file of files()) {
  console.log('>', file.path, file.size);
  

  // Function transforming the content:
  const f = compose(
    // Step 1: Inflate compressed files
    // IMPORTANT: use the 'raw' mode to inflate the content
    file.compressed && inflate({ raw : true }), 

    // Step 2: Decode text files:
    file.text.match(/\.txt$/) && decode()
  );

  let it = f(file.content());
  for let (let block of it) {
    // Blocks are decompressed and decoded to UTF8 for text files:
    console.log(block);
  }
}

```
