function lineSplitter(): TransformStream<string, string> {
  let buffer = '';
  return new TransformStream({
    transform(chunk, controller) {
      buffer += chunk;
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
        let line = buffer.slice(0, newlineIndex);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        controller.enqueue(line);
        buffer = buffer.slice(newlineIndex + 1);
      }
    },
    flush(controller) {
      if (buffer.length > 0) {
        controller.enqueue(buffer);
      }
    },
  });
}

export function streamLines(inputStream: ReadableStream<Uint8Array>): ReadableStream<string> {
  const td = new TextDecoderStream() as ReadableWritablePair<string, Uint8Array>;
  return inputStream.pipeThrough(td).pipeThrough(lineSplitter());
}
