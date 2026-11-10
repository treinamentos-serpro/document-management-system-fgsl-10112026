const { after, before, test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');

const storageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'dms-test-'));
const previousStorageDirectory = process.env.STORAGE_DIR;
const previousFileSizeLimit = process.env.MAX_FILE_SIZE_BYTES;
process.env.STORAGE_DIR = storageDirectory;
process.env.MAX_FILE_SIZE_BYTES = '1024';
const app = require('../src/app');
if (previousStorageDirectory === undefined) {
  delete process.env.STORAGE_DIR;
} else {
  process.env.STORAGE_DIR = previousStorageDirectory;
}
if (previousFileSizeLimit === undefined) {
  delete process.env.MAX_FILE_SIZE_BYTES;
} else {
  process.env.MAX_FILE_SIZE_BYTES = previousFileSizeLimit;
}

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await fsPromises.rm(storageDirectory, { recursive: true, force: true });
});

function createUploadForm(name, content) {
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'application/pdf' }), name);
  return form;
}

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('faz upload, lista e baixa um documento do proprietário', async () => {
  const owner = 'user-upload-download';
  const content = 'conteudo de teste';
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': owner },
    body: createUploadForm('relatorio.pdf', content)
  });

  assert.strictEqual(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.deepStrictEqual(Object.keys(uploadedDocument).sort(), [
    'id', 'originalName', 'owner', 'size', 'uploadedAt'
  ]);
  assert.strictEqual(uploadedDocument.originalName, 'relatorio.pdf');
  assert.strictEqual(uploadedDocument.owner, owner);
  assert.strictEqual(uploadedDocument.size, Buffer.byteLength(content));

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': owner }
  });
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual(await listResponse.json(), {
    documents: [uploadedDocument]
  });

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
    { headers: { 'X-User-Id': owner } }
  );
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(await downloadResponse.text(), content);
  assert.match(downloadResponse.headers.get('content-disposition'), /relatorio\.pdf/);
});

test('exige usuário e arquivo no upload', async () => {
  const missingOwnerResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: createUploadForm('arquivo.pdf', 'conteudo')
  });
  assert.strictEqual(missingOwnerResponse.status, 400);
  assert.strictEqual((await missingOwnerResponse.json()).error.code, 'OWNER_REQUIRED');

  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-without-file' },
    body: new FormData()
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');
});

test('limita o tamanho do arquivo enviado', async () => {
  const response = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'user-large-file' },
    body: createUploadForm('grande.pdf', 'x'.repeat(2048))
  });

  assert.strictEqual(response.status, 413);
  assert.strictEqual((await response.json()).error.code, 'FILE_TOO_LARGE');
});

test('não lista nem permite baixar documentos de outro usuário', async () => {
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    headers: { 'X-User-Id': 'owner-a' },
    body: createUploadForm('privado.pdf', 'privado')
  });
  const document = await uploadResponse.json();

  const listResponse = await fetch(`${baseUrl}/documents`, {
    headers: { 'X-User-Id': 'owner-b' }
  });
  assert.deepStrictEqual(await listResponse.json(), { documents: [] });

  const downloadResponse = await fetch(
    `${baseUrl}/documents/${document.id}/download`,
    { headers: { 'X-User-Id': 'owner-b' } }
  );
  assert.strictEqual(downloadResponse.status, 404);
});
