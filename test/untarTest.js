import tape from "tape-await";
// import * as url from 'url';
// import 
const __baseUrl = import.meta.url;
const __filename = new URL(__baseUrl).pathname;
const __dirname = new URL('.', __baseUrl).pathname;
import { promises as fs } from "fs";
import untar from "../src/untar.js";


async function* readFile(filePath) {
  const fullPath = new URL(filePath, __baseUrl).pathname;
  const data = await fs.readFile(fullPath, "binary");
  yield Buffer.from(data);
}

async function toString(content) {
  let str = '';
  const decoder = new TextDecoder();
  for await (let block of content) {
    str += decoder.decode(block);
  }
  return str;
}

tape('makeRelative', async (t) => {
  const buf = await readFile("./data/test.tar");
  const control = {
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
  }

  for await (const file of untar(buf)) {
    t.equal(control[file.path], await toString(file.content()));
  }
  // const buf = fs.readFileSync()

  // const fileNames = [
  //   "1.txt",
  //   "2.txt",
  //   "3.txt",
  //   "511.txt",
  //   "512.txt",
  //   "513.txt",
  //   "directory/",
  //   "directory/1.txt",
  //   "directory/2.txt",
  //   "directory/3.txt",
  //   "object.json"
  // ];

  // const fileContent = [
  //   (ct) => ct === "one",
  //   (ct) => ct === "two",
  //   (ct) => ct === "three",
  //   (ct) => ct.length === 511,
  //   (ct) => ct.length === 512,
  //   (ct) => ct.length === 513,
  //   (ct) => ct === "",
  //   (ct) => ct === "one",
  //   (ct) => ct === "two",
  //   (ct) => ct === "three",
  //   (ct) => ct === '{"prop":"value"}'
  // ]


})

