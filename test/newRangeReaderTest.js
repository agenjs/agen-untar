import tape from "tape-await";
import { newRangeReader } from "../src/index.js";

tape(`newRangeReader`, async function () {

  async function* fromStrings(it) {
    const encoder = new TextEncoder();
    for await (let str of it) {
      yield encoder.encode(str);
    }
  }

  tape(`should split the stream to multiple sequences`, async (t) => {
    const blocks = ["The quick ", "brown fox ", "jumps over ", "the lazy dog"];
    let it = fromStrings(blocks);
    const ranges = newRangeReader(it)
    const decoder = new TextDecoder();
    let fullString = '';
    const chunks = ["The ", "quick brown", "", " f", "ox jum", "ps ov", "er ", "t", "h", "", "", "e lazy", " dog"];
    const testChunks = [];
    for (const chunk of chunks) {
      let str = '';
      for await (const block of ranges(chunk.length)) {
        const s = decoder.decode(block);
        str += s;
        fullString += s;
      }
      testChunks.push(str);
    }
    t.deepEqual(testChunks, chunks, 'should re-build all chunks by their lengths');
    t.equal(fullString, blocks.join(''), 'should re-build the whole content');

    // Check that there is no more data in the stream.
    let finished = true;
    for await (let block of ranges(1)) {
      finished = false;
    }
    t.equal(finished, true, 'should consume all blocks till the end');
  });

});