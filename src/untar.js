import rawUntar from "./rawUntar.js";

export default async function* untar(it) {
  for await (let file of rawUntar(it)) {
    yield {
      path: file.name,
      async* content() {
        yield file.buffer;
      },
      size: file.size,
      modified: new Date(file.mtime),
      mode: file.mode,
      uid: file.uid,
      gid: file.gid
    }
  }
}