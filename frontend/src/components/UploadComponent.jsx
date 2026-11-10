import { useRef, useState } from 'react';
import { uploadDocument } from '../services/documentApi.js';
import { formatFileSize } from '../utils/formatFileSize.js';

export default function UploadComponent({ owner, onUploaded }) {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef(null);

  function selectFile(event) {
    setFile(event.target.files[0] || null);
    setError('');
    setSuccess('');
  }

  async function submitUpload(event) {
    event.preventDefault();
    if (!file || !owner.trim()) {
      return;
    }

    setIsUploading(true);
    setError('');
    setSuccess('');

    try {
      const document = await uploadDocument(file, owner);
      setSuccess(`${document.originalName} foi enviado.`);
      setFile(null);
      inputRef.current.value = '';
      onUploaded();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={submitUpload}>
      <label className={`file-picker${file ? ' has-file' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          onChange={selectFile}
          disabled={isUploading || !owner.trim()}
        />
        <span className="picker-mark" aria-hidden="true">+</span>
        <span className="picker-text">
          <strong>{file ? 'Trocar arquivo' : 'Selecionar arquivo'}</strong>
          <small>{file ? 'Escolha outro arquivo' : 'Clique para procurar no dispositivo'}</small>
        </span>
        <span className="picker-arrow" aria-hidden="true">↗</span>
      </label>

      {file && (
        <div className="selected-file" aria-live="polite">
          <span className="file-extension">{file.name.split('.').pop().slice(0, 4).toUpperCase()}</span>
          <span className="selected-file-name" title={file.name}>{file.name}</span>
          <span className="selected-file-size">{formatFileSize(file.size)}</span>
        </div>
      )}

      <button
        className="primary-button upload-submit"
        type="submit"
        disabled={!file || isUploading || !owner.trim()}
      >
        {isUploading ? 'Enviando...' : 'Enviar documento'}
      </button>

      {error && <p className="feedback-message error-message" role="alert">{error}</p>}
      {success && <p className="feedback-message success-message" role="status">{success}</p>}
    </form>
  );
}