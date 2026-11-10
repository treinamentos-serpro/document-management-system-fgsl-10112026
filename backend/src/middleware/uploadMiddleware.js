const { randomUUID } = require('node:crypto');
const multer = require('multer');
const localFileRepository = require('../repositories/localFileRepository');

const configuredFileSize = Number(process.env.MAX_FILE_SIZE_BYTES);
const fileSizeLimit = Number.isSafeInteger(configuredFileSize) && configuredFileSize > 0
  ? configuredFileSize
  : 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination(req, file, callback) {
    localFileRepository.ensureStorageDirectory()
      .then(() => callback(null, localFileRepository.storageDirectory))
      .catch(callback);
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  }
});

module.exports = multer({
  storage,
  limits: { fileSize: fileSizeLimit }
});