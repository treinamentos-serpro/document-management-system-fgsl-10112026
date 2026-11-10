const documentRepository = require('../repositories/documentRepository');
const localFileRepository = require('../repositories/localFileRepository');
const { toPublicDocument } = require('./documentMapper');

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

module.exports = { listDocuments, findDocumentForDownload };