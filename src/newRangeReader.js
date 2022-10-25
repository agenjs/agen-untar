export default function ranges(it) {
  let block, start = 0;
  return async function*(size) {
    while (size > 0) {
      if (block && start < block.length) {
        const s = Math.min(size, block.length - start);
        const b = (block.subarray || block.slice).call(block, start, start + s);
        start += s;
        size -= s;
        yield b;
      }
      // Read the next block. It allows to successfully finish the stream.
      if (!block || start >= block.length) {
        block = [];
        start = 0;
        const slot = await it.next();
        if (!slot || slot.done) break;
        block = await slot.value;
      }
    }
  }
}