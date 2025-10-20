import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Agente } from '../types/interfaces';
import { getAgenteById, downloadAgenteFile } from '../services/agentiService';
import '../styles/AgentView.css';

const label = (text: string) => <strong>{text}: </strong>;

const fmtSize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
};

const AgenteView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [agente, setAgente] = React.useState<Agente | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    let alive = true;
    (async () => {
      try {
        if (!id) throw new Error('ID non valido');
        setLoading(true);
        const data = await getAgenteById(id);
        if (alive) setAgente(data);
      } catch (e: any) {
        if (alive) setError(e?.response?.data?.error || e?.message || 'Errore di caricamento');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, isAuthenticated, navigate]);

  const onDownload = async (kind: 'contract' | 'legal') => {
    if (!id) return;
    try {
      await downloadAgenteFile(id, kind);
    } catch (e) {
      alert('Download non riuscito');
    }
  };

  if (loading) {
    return (
      <div className="agentv-container">
        <div className="agentv-card"><div className="agentv-loading">Caricamento…</div></div>
      </div>
    );
  }
  if (error || !agente) {
    return (
      <div className="agentv-container">
        <div className="agentv-card">
          <h3>Si è verificato un errore</h3>
          <p className="agentv-muted">{error}</p>
          <button className="agentv-btn ghost" onClick={() => navigate(-1)}>Torna</button>
        </div>
      </div>
    );
  }

  // Optional file props if your API returns them
  const contractName = (agente as any)?.signedContract?.originalName || (agente as any)?.signedContractName;
  const contractSize = (agente as any)?.signedContract?.size || (agente as any)?.signedContractSize;
  const legalName = (agente as any)?.legalDocument?.originalName || (agente as any)?.legalDocumentName;
  const legalSize = (agente as any)?.legalDocument?.size || (agente as any)?.legalDocumentSize;

  return (
    <div className="agentv-container">
      <div className="agentv-card">
        {/* Header + identity */}
        <div className="agentv-top">
          <div>
            <h2 className="agentv-title">{(agente as any).contactName || agente.businessName}</h2>
            <div className="agentv-row">
              {label('Agente')}<span>-</span>
            </div>
            <div className="agentv-row">
              {label('P. IVA')}<span>{agente.vatNumber}</span>
            </div>
            <div className="agentv-row">
              {label('Indirizzo')}
              <span>
                {(agente as any)?.address?.street || '-'}
                {(agente as any)?.address?.city ? `, ${(agente as any)?.address?.city}` : ''}
                {(agente as any)?.address?.postalCode ? ` ${ (agente as any)?.address?.postalCode}` : ''}
                {(agente as any)?.address?.province ? ` (${(agente as any)?.address?.province})` : ''}
              </span>
            </div>
            <div className="agentv-row">
              {label('Email')}<span>{agente.email || '-'}</span>
            </div>
            <div className="agentv-row">
              {label('PEC')}<span>{(agente as any).pec || '-'}</span>
            </div>
          </div>

          <div className="agentv-right">
            <div className="agentv-row">
              {label('Commissione')}<span>{agente.agreedCommission != null ? `${agente.agreedCommission}%` : '-'}</span>
            </div>
            <div className="agentv-row">
              {label('Creato il')}<span>{new Date(agente.createdAt).toLocaleString('it-IT')}</span>
            </div>
            <div className="agentv-row">
              {label('Aggiornato il')}<span>{agente.updatedAt ? new Date(agente.updatedAt).toLocaleString('it-IT') : '-'}</span>
            </div>
            <div className="agentv-row">
              {label('Stato')}
              <span className={`agentv-pill ${agente.isActive ? 'ok' : 'ko'}`}>
                {agente.isActive ? 'Attivo' : 'Inattivo'}
              </span>
            </div>
            <div className="agentv-row">
              {label('Approvazione')}<span>{(agente as any).isApproved ? 'Approvato' : '—'}</span>
            </div>
          </div>
        </div>

        <hr className="agentv-sep" />

        {/* Documents */}
        <div className="agentv-docs">
          <div className="agentv-doc-card">
            <h4>Contratto Firmato</h4>
            <p className="agentv-file">
              <strong>File:</strong>&nbsp;
              {contractName ? `${contractName}${contractSize ? ` (${fmtSize(contractSize)})` : ''}` : <span className="agentv-muted">Nessun file</span>}
            </p>
            <button
              className="agentv-btn primary"
              disabled={!contractName}
              onClick={() => onDownload('contract')}
            >
              Scarica Contratto
            </button>
          </div>

          <div className="agentv-doc-card">
            <h4>Documento Legale</h4>
            <p className="agentv-file">
              <strong>File:</strong>&nbsp;
              {legalName ? `${legalName}${legalSize ? ` (${fmtSize(legalSize)})` : ''}` : <span className="agentv-muted">Nessun file</span>}
            </p>
            <button
              className="agentv-btn primary"
              disabled={!legalName}
              onClick={() => onDownload('legal')}
            >
              Scarica Documento
            </button>
          </div>
        </div>

        {/* footer actions */}
        <div className="agentv-actions">
          <button className="agentv-btn ghost" onClick={() => navigate('/agenti')}>Torna all’elenco</button>
          <button className="agentv-btn" onClick={() => navigate(`/agenti/edit/${agente._id}`)}>Modifica</button>
        </div>
      </div>
    </div>
  );
};

export default AgenteView;
