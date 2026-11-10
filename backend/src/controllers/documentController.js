const documentService = require('../services/documentService');

function requireOwner(req, res, next) {
  const owner = req.get('X-User-Id');
  if (!owner || !owner.trim()) {
    return res.status(400).json({
      error: {
        code: 'OWNER_REQUIRED',
        message: 'Informe o usuário do documento.'
      }
    });
  }

  req.owner = owner.trim();
  return next();
}

async function upload(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'FILE_REQUIRED',
        message: 'Selecione um arquivo para enviar.'
      }
    });
  }

  try {
    const document = await documentService.uploadDocument(req.file, req.owner);
    return res.status(201).json(document);
  } catch (error) {
    return next(error);
  }
}

function list(req, res, next) {
  try {
    const documents = documentService.listDocuments(req.owner);
    return res.status(200).json({ documents });
  } catch (error) {
    return next(error);
  }
}

async function download(req, res, next) {
  try {
    const result = await documentService.findDocumentForDownload(
      req.params.id,
      req.owner
    );

    if (!result) {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Documento não encontrado.'
        }
      });
    }

    return res.download(result.filePath, result.document.originalName, (error) => {
      if (!error) {
        return;
      }

      if (res.headersSent) {
        return next(error);
      }

      if (error.code === 'ENOENT') {
        return res.status(404).json({
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Documento não encontrado.'
          }
        });
      }

      return next(error);
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireOwner, upload, list, download };