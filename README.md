# popgen-toolbox

TypeScript tools for population genetics file formats, published to npm under
the `@popgen-toolbox` scope. This is an npm workspace monorepo: each
publishable unit lives in its own folder under `packages/` with its own
`package.json`, version, and README.

## Packages

- [`packages/genotype-io`](packages/genotype-io) — published as
  [`@popgen-toolbox/genotype-io`](https://www.npmjs.com/package/@popgen-toolbox/genotype-io).
  Streaming parsers for PLINK `.bed`/`.bim`/`.fam` genotype files.

More packages (e.g. PCA, F-statistics) will be added here over time,
alongside the existing PureScript-based packages of the same
`@popgen-toolbox` scope published from
[pcproject](https://github.com/stschiff/pcproject).

## Development

```bash
npm install                                    # installs all workspaces
npm run build --workspace=packages/genotype-io # build one package
```

## Publishing a package

1. Bump the version in the package's `package.json`.
2. `npm publish --workspace=packages/<name>` (runs that package's own
   `prepublishOnly` build first).
3. Verify: `npm view @popgen-toolbox/<name> version`.

## License

MIT — see [LICENSE](LICENSE). Each package also carries its own copy so it
ships correctly in the published npm tarball.
