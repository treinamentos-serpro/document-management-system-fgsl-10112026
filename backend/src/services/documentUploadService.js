const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');
const { toPublicDocument } = require('./documentMapper');

async function uploadDocument(file, owner) {
  const document = {
    id: randomUUID(),
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
    storageName: file.filename
  };

  try {
    documentRepository.save(document);
  } catch (error) {
    await localFileRepository.remove(file.filename).catch(() => {});
    throw error;
  }

  return toPublicDocument(document);
}

module.exports = { uploadDocument };