const documents = new Map();

function save(document) {
  documents.set(document.id, { ...document });
  return { ...document };
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

function findByOwner(owner) {
  return [...documents.values()]
    .filter((document) => document.owner === owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map((document) => ({ ...document }));
}

function remove(id) {
  documents.delete(id);
}

module.exports = { save, findById, findByOwner, remove };