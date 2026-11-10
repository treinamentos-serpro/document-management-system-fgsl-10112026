import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import { listDocuments } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [owner, setOwner] = useState('usuario-1');
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    if (!owner.trim()) {
      setDocuments([]);
      setIsLoading(false);
      setListError('');
      return () => {
        isCurrent = false;
      };
    }

    setIsLoading(true);
    setListError('');

    listDocuments(owner)
      .then((result) => {
        if (isCurrent) {
          setDocuments(result);
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setListError(error.message);
        }
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [owner, listVersion]);

  function refreshDocuments() {
    setListVersion((version) => version + 1);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="#inicio" aria-label="DMS, início">
          <span className="wordmark-symbol" aria-hidden="true">D</span>
          <span>DMS <small>DOCUMENTOS</small></span>
        </a>
        <div className="connection-state"><span /> Armazenamento local</div>
      </header>

      <main id="inicio" className="main-content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">ESPAÇO DE TRABALHO</p>
            <h1 id="page-title">Seus documentos<span>.</span></h1>
            <p className="heading-copy">Envie e acesse seus arquivos em um só lugar.</p>
          </div>
          <label className="owner-field">
            <span>ID do usuário</span>
            <input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              autoComplete="off"
              spellCheck="false"
              aria-label="ID do usuário"
            />
          </label>
        </section>

        <div className="workspace-grid">
          <section className="upload-panel" aria-labelledby="upload-title">
            <div className="section-kicker"><span>01</span> NOVO ARQUIVO</div>
            <h2 id="upload-title">Adicionar documento</h2>
            <p className="section-copy">Escolha um arquivo para armazenar.</p>
            <UploadComponent owner={owner} onUploaded={refreshDocuments} />
          </section>

          <section className="library-section" aria-labelledby="library-title">
            <div className="library-heading">
              <div>
                <div className="section-kicker"><span>02</span> ARQUIVO PESSOAL</div>
                <h2 id="library-title">Documentos</h2>
              </div>
              <span className="document-count" aria-label={`${documents.length} documentos`}>
                {String(documents.length).padStart(2, '0')}
              </span>
            </div>
            <DocumentList
              documents={documents}
              owner={owner}
              isLoading={isLoading}
              error={listError}
              onRetry={refreshDocuments}
            />
          </section>
        </div>
      </main>

      <footer className="footer-note">
        <span>DMS</span>
        <span>Os arquivos são armazenados nesta aplicação.</span>
      </footer>
    </div>
  );
}
