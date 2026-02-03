import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/Dashboard.css';
import '../styles/Conto.css';
import { contoService, type AccountType, type Transaction, type ContoFilters, type TransactionType, type TransactionStatus, type Summary, getContoImports, type ContoImportItem } from '../services/contoService';
import { useAuth } from '../contexts/AuthContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

const Conto: React.FC = () => {
  const { user } = useAuth();
  const params = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const initialTab = (params.tab === 'servizi' || params.tab === 'proselitismo') ? (params.tab as AccountType) : 'proselitismo';
  const [activeAccount, setActiveAccount] = useState<AccountType>(initialTab);
  const [filters, setFilters] = useState<ContoFilters>({ type: '', status: '', q: '' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summaryFromApi, setSummaryFromApi] = useState<Summary | null>(null);
  const [imports, setImports] = useState<ContoImportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Local mock fallback
  const mockTx: Transaction[] = [
    { id: '1', account: 'proselitismo', date: '2025-01-10', description: 'Provvigioni mese', amount: 2200, type: 'entrata', status: 'completata', category: 'Provvigioni' },
    { id: '2', account: 'proselitismo', date: '2025-01-12', description: 'Rimborso spese', amount: 120, type: 'entrata', status: 'completata', category: 'Rimborsi' },
    { id: '3', account: 'proselitismo', date: '2025-01-15', description: 'Acquisto materiale', amount: -180, type: 'uscita', status: 'completata', category: 'Costi' },
    { id: '4', account: 'servizi', date: '2025-02-02', description: 'Compenso progetto A', amount: 1450, type: 'entrata', status: 'in_attesa', category: 'Servizi' },
    { id: '5', account: 'servizi', date: '2025-02-06', description: 'Pagamento fornitore', amount: -350, type: 'uscita', status: 'completata', category: 'Fornitori' },
    { id: '6', account: 'servizi', date: '2025-02-10', description: 'Compenso progetto B', amount: 980, type: 'entrata', status: 'completata', category: 'Servizi' },
  ];

  const filteredTx = useMemo(() => {
    const getTxUserId = (t: Transaction) =>
      t.userId ||
      (typeof t.user === 'string' ? t.user : t.user?._id) ||
      t.createdBy ||
      t.ownerId ||
      '';

    const hasUserInfo = transactions.some((t) => !!getTxUserId(t));
    const myUserId = user?._id || '';

    if (!hasUserInfo) return [];

    return transactions
      .filter((t) => t.account === activeAccount)
      .filter((t) => (filters.type ? t.type === filters.type : true))
      .filter((t) => (filters.status ? t.status === filters.status : true))
      .filter((t) => (filters.from ? t.date >= filters.from : true))
      .filter((t) => (filters.to ? t.date <= filters.to : true))
      .filter((t) => (filters.q ? t.description.toLowerCase().includes((filters.q as string).toLowerCase()) : true))
      .filter((t) => {
        if (!myUserId) return false;
        return getTxUserId(t) === myUserId;
      });
  }, [transactions, activeAccount, filters, user?._id]);

  const derivedSummary = useMemo(() => {
    const incoming = filteredTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const outgoing = filteredTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    return {
      balance: incoming + outgoing,
      incoming,
      outgoing: Math.abs(outgoing),
      nonRiconciliateTotal: 0,
      updatedAt: new Date().toISOString(),
    };
  }, [filteredTx]);

  const summary = summaryFromApi ?? derivedSummary;

  const onFilterChange = (patch: Partial<ContoFilters>) => setFilters((f) => ({ ...f, ...patch }));

  // Fetch data with fallback
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [tx, sum] = await Promise.all([
          contoService.getTransactions(activeAccount, filters, user?._id),
          contoService.getSummary(activeAccount, filters, user?._id),
        ]);
        if (!cancelled) setTransactions(tx);
        if (!cancelled) setSummaryFromApi(sum);
      } catch (e: any) {
        console.warn('getTransactions failed, using mock fallback', e?.message || e);
        const tx = mockTx; // fallback
        if (!cancelled) setTransactions(tx);
        if (!cancelled) setSummaryFromApi(null);
        setError('Dati non disponibili, mostrati valori di esempio.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [activeAccount, filters.from, filters.to, filters.type, filters.status, filters.q]);

  useEffect(() => {
    let cancelled = false;
    const loadImports = async () => {
      try {
        const data = await getContoImports();
        if (!cancelled) setImports(data);
      } catch (e) {
        if (!cancelled) setImports([]);
      }
    };
    loadImports();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (params.tab && (params.tab === 'servizi' || params.tab === 'proselitismo')) {
      setActiveAccount(params.tab as AccountType);
    }
  }, [params.tab]);

  const goTab = (tab: AccountType) => {
    setActiveAccount(tab);
    navigate(`/conto/${tab}`);
  };

  return (
    <div className="dashboard-page">
      <h2 className="welcome-header">Conto</h2>
      {loading && <div className="notification-banner">Carico i dati...</div>}
      {error && <div className="notification-banner secondary">{error}</div>}

      <div className="dashboard-tabs">
        <div
          className={`tab ${activeAccount === 'proselitismo' ? 'active' : ''}`}
          onClick={() => goTab('proselitismo')}
        >
          Conto proselitismo
        </div>
        <div
          className={`tab ${activeAccount === 'servizi' ? 'active' : ''}`}
          onClick={() => goTab('servizi')}
        >
          Conto servizi
        </div>
      </div>

      <div className="projects-section" style={{ marginBottom: 20 }}>
        <div className="project-card-dash">
          <div className="project-number">{formatCurrency(summary.balance)}</div>
          <div className="project-title">Saldo FIACOM</div>
        </div>
        <div className="project-card-dash">
          <div className="project-number">{formatCurrency(summary.nonRiconciliateTotal || 0)}</div>
          <div className="project-title">Quote non riconciliate</div>
        </div>
        <div className="project-card-dash">
          <div className="project-number">{formatCurrency(summary.outgoing)}</div>
          <div className="project-title">Uscite</div>
        </div>
      </div>

      <div className="utility-section" style={{ marginBottom: 20 }}>
        <div className="section-header">Filtri</div>
        <div className="conto-filters-grid">
          <div className="filter-field">
            <label className="filter-label">Da</label>
            <input
              className="filter-input"
              type="date"
              value={filters.from || ''}
              onChange={(e) => onFilterChange({ from: e.target.value })}
            />
          </div>
          <div className="filter-field">
            <label className="filter-label">A</label>
            <input
              className="filter-input"
              type="date"
              value={filters.to || ''}
              onChange={(e) => onFilterChange({ to: e.target.value })}
            />
          </div>
          <div className="filter-field">
            <label className="filter-label">Tipo</label>
            <select className="filter-select" value={filters.type} onChange={(e) => onFilterChange({ type: e.target.value as TransactionType | '' })}>
              <option value="">Tutti</option>
              <option value="entrata">Entrata</option>
              <option value="uscita">Uscita</option>
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Stato</label>
            <select className="filter-select" value={filters.status} onChange={(e) => onFilterChange({ status: e.target.value as TransactionStatus | '' })}>
              <option value="">Tutti</option>
              <option value="completata">Completata</option>
              <option value="in_attesa">In attesa</option>
              <option value="annullata">Annullata</option>
            </select>
          </div>
          <div className="filter-field">
            <label className="filter-label">Ricerca</label>
            <input
              className="filter-input"
              type="text"
              placeholder="Descrizione..."
              value={filters.q || ''}
              onChange={(e) => onFilterChange({ q: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="utility-section">
        <div className="section-header">Movimenti</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Data</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Descrizione</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Importo</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Tipo</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Stato</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Categoria</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                  <td style={{ padding: '8px' }}>{new Date(t.date).toLocaleDateString('it-IT')}</td>
                  <td style={{ padding: '8px' }}>{t.description}</td>
                  <td style={{ padding: '8px', color: t.amount < 0 ? '#e74c3c' : '#253676', fontWeight: 600 }}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td style={{ padding: '8px', textTransform: 'capitalize' }}>{t.type}</td>
                  <td style={{ padding: '8px', textTransform: 'capitalize' }}>{t.status.replace('_', ' ')}</td>
                  <td style={{ padding: '8px' }}>{t.category}</td>
                </tr>
              ))}
              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 16, color: '#666' }}>Nessun movimento trovato.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="utility-section" style={{ marginTop: 20 }}>
        <div className="section-header">Registro flussi</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Data</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Orario</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Nome file</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Chiave univoca</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Righe</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((item) => {
                const date = new Date(item.createdAt);
                return (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '8px' }}>{date.toLocaleDateString('it-IT')}</td>
                    <td style={{ padding: '8px' }}>{date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td style={{ padding: '8px' }}>{item.originalName}</td>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: 12 }}>{item.fileHash}</td>
                    <td style={{ padding: '8px' }}>{item.rowCount}</td>
                  </tr>
                );
              })}
              {imports.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 16, color: '#666' }}>Nessun file flussi caricato.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Conto;
