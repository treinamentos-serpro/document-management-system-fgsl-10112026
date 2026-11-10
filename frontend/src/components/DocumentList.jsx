import DownloadButton from './DownloadButton.jsx';
import { formatFileSize } from '../utils/formatFileSize.js';

function formatUploadDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

export default function DocumentList({ documents, owner, isLoading, error, onRetry }) {
  if (isLoading) {
    return <p className="list-state" role="status">Carregando documentos...</p>;
  }

  if (error) {
    return (
      <div className="list-state list-error" role="alert">
        <p>{error}</p>
        <button className="text-button" type="button" onClick={onRetry}>Tentar novamente</button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">—</span>
        <p>Nenhum documento por aqui.</p>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {documents.map((document) => (
        <li className="document-row" key={document.id}>
          <span className="file-extension" aria-hidden="true">
            {document.originalName.split('.').pop().slice(0, 4).toUpperCase()}
          </span>
          <div className="document-details">
            <strong className="document-name" title={document.originalName}>
              {document.originalName}
            </strong>
            <span>{formatUploadDate(document.uploadedAt)} <i /> {formatFileSize(document.size)}</span>
          </div>
          <DownloadButton document={document} owner={owner} />
        </li>
      ))}
    </ul>
  );
}