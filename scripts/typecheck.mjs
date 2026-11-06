import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The override allows a compiler unpacked outside node_modules for restricted workers.
const imported = await import(process.env.TYPESCRIPT_MODULE ? pathToFileURL(resolve(process.env.TYPESCRIPT_MODULE)).href : 'typescript');
const ts = imported.default ?? imported;
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const code = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
if (!code) throw new Error('The inline game script is missing.');
const virtualFile = resolve(import.meta.dirname, '../game.inline.js');
const options = {
  allowJs: true, checkJs: true, strict: true, noEmit: true,
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'], types: []
};
const host = ts.createCompilerHost(options);
const originalRead = host.readFile.bind(host);
host.readFile = (path) => path === virtualFile ? code : originalRead(path);
const originalExists = host.fileExists.bind(host);
host.fileExists = (path) => path === virtualFile || originalExists(path);
const program = ts.createProgram([virtualFile], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCurrentDirectory: () => process.cwd(),
    getCanonicalFileName: (file) => file,
    getNewLine: () => '\n'
  }));
  process.exitCode = 1;
} else {
  console.log('PASS: inline JavaScript checked by TypeScript (strict, checkJs, noEmit).');
}
