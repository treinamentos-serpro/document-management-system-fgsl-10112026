const API_PREFIX = '/api';

async function request(path, owner, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('X-User-Id', owner.trim());

  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.';
    try {
      const body = await response.json();
      message = body.error?.message || message;
    } catch {
      // Mantém a mensagem genérica para respostas sem JSON.
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response;
}

export async function uploadDocument(file, owner) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', owner, {
    method: 'POST',
    body: formData
  });
  return response.json();
}

export async function listDocuments(owner) {
  const response = await request('/documents', owner);
  const body = await response.json();
  return body.documents;
}

export async function downloadDocument(id, owner, fallbackName) {
  const response = await request(
    `/documents/${encodeURIComponent(id)}/download`,
    owner
  );
  const disposition = response.headers.get('Content-Disposition') || '';
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plainName = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  let filename = encodedName || plainName || fallbackName;

  if (encodedName) {
    try {
      filename = decodeURIComponent(encodedName);
    } catch {
      filename = fallbackName;
    }
  }

  return { blob: await response.blob(), filename };
}