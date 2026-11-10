const fs = require('node:fs/promises');
const path = require('node:path');

const storageDirectory = path.resolve(
  process.env.STORAGE_DIR || path.join(__dirname, '../../storage')
);

function getFilePath(storageName) {
  if (path.basename(storageName) !== storageName) {
    throw new Error('Nome de armazenamento inválido.');
  }

  return path.join(storageDirectory, storageName);
}

async function ensureStorageDirectory() {
  await fs.mkdir(storageDirectory, { recursive: true });
}

async function exists(storageName) {
  try {
    await fs.access(getFilePath(storageName));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }

    throw error;
  }
}

async function remove(storageName) {
  try {
    await fs.unlink(getFilePath(storageName));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

module.exports = {
  storageDirectory,
  getFilePath,
  ensureStorageDirectory,
  exists,
  remove
};