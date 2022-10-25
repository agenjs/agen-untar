import tape from "tape-await";
// import * as url from 'url';
// import 
const __baseUrl = import.meta.url;
const __filename = new URL(__baseUrl).pathname;
const __dirname = new URL('.', __baseUrl).pathname;
import fs from "fs";
// import { promises as fs } from "fs";
import untar from "../src/untar.js";


async function* readFile(filePath) {
  const fullPath = new URL(filePath, __baseUrl).pathname;
  const stream = fs.createReadStream(fullPath);
  yield* stream;
}

async function toString(content) {
  let str = '';
  const decoder = new TextDecoder();
  for await (let block of content) {
    str += decoder.decode(block);
  }
  return str;
}

async function testTarFile(t, filePath, control) {
  const stream = await readFile(filePath);
  for await (const file of untar(stream)) {
    t.equal(control[file.path], await toString(file.content()));
  }
}

tape('untar - should extract multi-file archives ', async (t) => {
  await testTarFile(t, "./data/test.tar", {
    '1.txt': 'one',
    '2.txt': 'two',
    '3.txt': 'three',
    '511.txt': '5115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115115',
    '512.txt': '51251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251251',
    '513.txt': '513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513513v51351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351351',
    'directory/': '',
    'directory/1.txt': 'one',
    'directory/2.txt': 'two',
    'directory/3.txt': 'three',
    'object.json': '{"prop":"value"}'
  });
})

tape('untar - should extract pax headers ', async (t) => {
  await testTarFile(t, "./data/test-pax.tar", {
    'é.txt': '',
  });
})

tape('untar - should extract files with common prefixes ', async (t) => {
  await testTarFile(t, "./data/test-ustar-with-prefix.tar", {
    "directory-000/directory-001/directory-002/directory-003/directory-004/directory-005/directory-006/foo.txt": 'text',
  });
});

tape('untar - should extract single file ', async (t) => {
  await testTarFile(t, "./data/test-ustar.tar", {
    "foo": 'iRFmWghs3CK9/2HSvRja4TzX8HsRwzbVYl+h0HRkH9uPho2BGmrG5a0vpHsPn2W7Pn33Ux/+rkLSA3GUOX/WiPmP+h73T1r0DZIDJXtOgYWIUhsqUE0zUz1LEaO/y2H+WAe/ZlWt90N2KHka0bkXajoEAdOUrN42PKl/3mu7jiCW45hTNBDp3ArJD8QHN7l3JFMfnusPuir9+K8Oh6bEfN2bHhXjZ41ZkweCHZWUKT8NsdHeObQnXAyvkU5q1OhefE0+uvksVba2ZNyhThAAGZgiqEtTOJJLm8zgcI5avXHMVwlR6mt1jepOct4jQNlAdpkmslKW3BuiwLswGAsw7ttr/pRa/oCT4HUoBWcY3w96+TGR6uXtvbDOM9WhPXGo+1bwhAsA/RXPA1ZX+oS6t4rl/ZvkMZZN4VO5OvKph8tthdG3ocpXUw11zv6mQ7n6kyObLDCMFOtkdnhQBU/BGEK6mw4oTRa1Hd91+bUUqQh6hl3JeDk/t2KDWOEehOxgOqfVG72UuMeo2IayNK/pUXrcUXuywq9KT+bWQxdJsXzwkkyT8Ovz4oiIzHAa14e/Ib8Xxz+BHwpN3TtOXsHziuqLGMzqv867CganwsFxNEGRaTQ6C2bRK+OxetaxhQqe1G/UWwfi5a9PuJC3wfITSa0IhBot9hGAG35VVb4LsRE=',
  });

})

