const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

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

function listDocuments(owner) {
  return documentRepository.findByOwner(owner).map(toPublicDocument);
}

async function findDocumentForDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) {
    return null;
  }

  if (!(await localFileRepository.exists(document.storageName))) {
    return null;
  }

  return {
    document: toPublicDocument(document),
    filePath: localFileRepository.getFilePath(document.storageName)
  };
}

module.exports = { uploadDocument, listDocuments, findDocumentForDownload };