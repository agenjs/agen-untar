@agen/untar
===========

This package contains a AsyncIterator-based untar utility methods. The main method - `untar` - provides
an asynchronous iterator over file entries stored in the archive. 
The structure of returned file instances:
* `path` - path to the file; for directories it contains the trailing `/` symbol.
* `async* content()` - return an async iterator over the raw content of the file
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
import { untar } from '@agen/untar';

const stream = fs.createReadStream('./MyArchive.tar'); // Node streams are AsyncIterator generators
for await (let file of untar(stream)) {
  console.log('>', file.path, file.size);
  let content;
  if (file.path.match(/\.txt$/))  {
    content = await toString(file.content());
  } else {
    content = await toBlob(file.content());
  };
  console.log('>', content);
}

async function toBlob(content) {
  const chunks = [];
  for await (let block of content) {
    chunks.push(chunk);
  }
  return new Blob(chunks);
}

async function toString(content) {
  let str = '';
  const decoder = new TextDecoder();
  for await (let block of content) {
    str += decoder.decode(block);
  }
  return str;
}

```