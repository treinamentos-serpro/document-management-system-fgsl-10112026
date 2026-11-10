const { uploadDocument } = require('./documentUploadService');
const { listDocuments, findDocumentForDownload } = require('./documentQueryService');

module.exports = { uploadDocument, listDocuments, findDocumentForDownload };