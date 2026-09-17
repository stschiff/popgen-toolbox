import { streamLines } from "./utils.js";

type SnpEntry = {
    snpIDs: string;
    chromosomes: number;
    positions: number;
    alleles1: number; // encoded as charcode
    alleles2: number;
}

type IndEntry = {
    indNames: string;
    popNames: string;
}

function parseBimLine(line: string): SnpEntry {
    const fields = line.split('\t');
    return {
        snpIDs: fields[0],
        chromosomes: parseInt(fields[1]),
        positions: parseInt(fields[2]),
        alleles1: fields[3].charCodeAt(0),
        alleles2: fields[4].charCodeAt(0),
    };
}

export function streamBimFile(inputStream: ReadableStream<Uint8Array>): ReadableStream<SnpEntry> {
    return streamLines(inputStream).pipeThrough(new TransformStream({
        transform(line, controller) {
            controller.enqueue(parseBimLine(line));
        },
    }));
}

export function readFamFile(famTextContent: string): IndEntry[] {
  return Array.from(famTextContent.trim().split('\n'), line => {
    const fields = line.trim().split(/\s+/);
    return {
      popNames: fields[0],
      indNames: fields[1],
    };
  });
}

function extendBuffer(buffer: Uint8Array, start: number, end: number, newValues: Uint8Array): [Uint8Array, number, number] {
  const requiredBufferLength = (end - start) + newValues.length;
  if (requiredBufferLength > buffer.length) { // buffer not large enough.
    const grown = new Uint8Array(Math.max(requiredBufferLength, buffer.length * 2));
    grown.set(buffer.subarray(start, end));
    buffer = grown;
    end -= start;
    start = 0;
  }
  if (end + newValues.length > buffer.length) { // compactify buffer
    buffer.copyWithin(0, start, end);
    end -= start;
    start = 0;
  }
  buffer.set(newValues, end);
  end += newValues.length;
  return [buffer, start, end];
}

export function streamBedFile(inputStream: ReadableStream<Uint8Array>, indCount: number): ReadableStream<Uint8Array> {
  const blockSize = Math.ceil(indCount / 4);
  let buffer: Uint8Array = new Uint8Array(10 * blockSize);
  let bufferStart = 0;
  let bufferEnd = 0;
  let headerChecked = false;
  if(!(indCount > 0)) throw new Error("indCount must be greater than 0");
  return inputStream.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      [buffer, bufferStart, bufferEnd] = extendBuffer(buffer, bufferStart, bufferEnd, chunk);
      if (!headerChecked && bufferEnd >= 3) {
        if (buffer[0] !== 0b01101100 || buffer[1] !== 0b00011011 || buffer[2] !== 0b00000001) {
            throw new Error("Invalid .bed file: incorrect magic numbers");
        }
        headerChecked = true;
        bufferStart = 3;
      }
      while (headerChecked && bufferEnd - bufferStart >= blockSize) {
        const retArray = new Uint8Array(indCount);
        for (let i = 0; i < indCount; i++) {
          const byteIndex = Math.floor(i / 4);
          const bitOffset = (i % 4) * 2;
          const genotypeBits = (buffer[bufferStart + byteIndex] >> bitOffset) & 0b11;
          switch (genotypeBits) {
              case 0b00:
                  retArray[i] = 0; break; // Homozygous reference
              case 0b10:
                  retArray[i] = 1; break; // Heterozygous
              case 0b11:
                  retArray[i] = 2; break; // Homozygous alternate
              case 0b01:
                  retArray[i] = 3; break; // Missing genotype
          }
        }
        controller.enqueue(retArray);
        bufferStart += blockSize;
      }
    },
  }));
}

type PlinkInput = {
  famStream: ReadableStream<Uint8Array>,
  bedStream: ReadableStream<Uint8Array>,
  bimStream: ReadableStream<Uint8Array>
}

type GenotypeOutput = {
  indEntries: IndEntry[],
  genotypeStream: ReadableStream<[SnpEntry, Uint8Array]>
}

export async function readPlink(plinkInput: PlinkInput): Promise<GenotypeOutput> {
  const famText = await new Response(plinkInput.famStream).text();
  const indEntries = readFamFile(famText);

  const bimReader = streamBimFile(plinkInput.bimStream).getReader();
  const bedReader = streamBedFile(plinkInput.bedStream, indEntries.length).getReader();

  const genotypeStream = new ReadableStream<[SnpEntry, Uint8Array]>({
    async pull(controller) {
      const [{ value: snpEntry, done: bimDone }, { value: genotypes, done: bedDone }] =
        await Promise.all([bimReader.read(), bedReader.read()]);
      if (bimDone || bedDone) {
        controller.close();
        return;
      }
      controller.enqueue([snpEntry, genotypes]);
    },
    cancel() {
      bimReader.cancel();
      bedReader.cancel();
    },
  });

  return { indEntries, genotypeStream };
}
