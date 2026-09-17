# @popgen-toolbox/genotype-io

Streaming parsers for PLINK `.bed`/`.bim`/`.fam` genotype files, built on
Web Streams so large `.bed`/`.bim` files can be processed chunk-by-chunk
without loading them fully into memory. Works the same in a browser tab or
a Node script (Node's `fetch` response bodies are `ReadableStream`s too).

Source: [popgen-toolbox](https://github.com/stschiff/popgen-toolbox/tree/main/packages/genotype-io).

## Install

```bash
npm install @popgen-toolbox/genotype-io
```

## Usage

```ts
import { readFamFile, streamBimFile, streamBedFile, readPlink } from "@popgen-toolbox/genotype-io/plink";

const famText = await fetch(".../sample.fam").then(r => r.text());
const indEntries = readFamFile(famText); // { indNames, popNames }[]

// or process a whole trio together, streaming SNP-by-SNP:
const { indEntries, genotypeStream } = await readPlink({
  famStream: await fetch(".../sample.fam").then(r => r.body),
  bimStream: await fetch(".../sample.bim").then(r => r.body),
  bedStream: await fetch(".../sample.bed").then(r => r.body),
});

const reader = genotypeStream.getReader();
for (let r = await reader.read(); !r.done; r = await reader.read()) {
  const [snpEntry, genotypes] = r.value; // genotypes: Uint8Array, one byte per individual
}
```

## Exports

- `@popgen-toolbox/genotype-io/plink`
  - `readFamFile(text)` → `{ indNames: string, popNames: string }[]`
  - `streamBimFile(stream)` → `ReadableStream` of
    `{ snpIDs, chromosomes, positions, alleles1, alleles2 }` per SNP line
  - `streamBedFile(stream, indCount)` → `ReadableStream<Uint8Array>`, one
    genotype-call byte per individual per SNP block (`0`/`1`/`2`/`3` for
    hom-ref/het/hom-alt/missing)
  - `readPlink({ famStream, bimStream, bedStream })` → combines all three
    into `{ indEntries, genotypeStream }`, the latter yielding `[snpEntry,
    genotypes]` pairs
- `@popgen-toolbox/genotype-io/utils`
  - `streamLines(stream)` → `ReadableStream<string>`, decoding and
    splitting a byte stream into text lines

## License

MIT
