import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../styles/Dashboard.css';
import '../styles/Conto.css';
import { contoService, type AccountType, type Transaction, type ContoFilters, type Summary, getContoImports, type ContoImportItem, getNonRiconciliate, type NonRiconciliataItem, type BreakdownRow } from '../services/contoService';
import { getCompanies } from '../services/companyService';
import type { Company } from '../types/interfaces';
import { useAuth } from '../contexts/AuthContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);

const normalizeCompanyKey = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

const extractCompanyFromDescription = (value: string) => {
  if (!value) return '';
  const match = value.match(/Azienda:\s*([^|]+)/i);
  return match ? match[1].trim() : '';
};

const extractMatricolaFromDescription = (value: string) => {
  if (!value) return '';
  const match = value.match(/Matricola:\s*([0-9A-Za-z]+)/i);
  return match ? match[1].trim() : '';
};

const contoServiziOptions = [
  'Supporto agli associati con assistenza contrattuale',
  'Promozione attività formative inerenti la sicurezza e salute sui luoghi di lavoro',
  'Promozione del fondo sanitario e del welfare aziendale',
  'Promozione e sviluppo della formazione professionale e delle pari opportunità',
  'Consulenza del lavoro',
];

const Conto: React.FC = () => {
  const { user } = useAuth();
  const isSportello = user?.role === 'sportello_lavoro';
  const isResponsabile = user?.role === 'responsabile_territoriale';
  const isRestrictedView = isSportello || isResponsabile;
  const params = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const initialTab = (params.tab === 'servizi' || params.tab === 'proselitismo') ? (params.tab as AccountType) : 'proselitismo';
  const [activeAccount, setActiveAccount] = useState<AccountType>(initialTab);
  const [filters, setFilters] = useState<ContoFilters>({ type: '', status: '', q: '' });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summaryFromApi, setSummaryFromApi] = useState<Summary | null>(null);
  const [imports, setImports] = useState<ContoImportItem[]>([]);
  const [nonRiconciliate, setNonRiconciliate] = useState<NonRiconciliataItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [transactionsLoading, setTransactionsLoading] = useState<boolean>(false);
  const [summaryReady, setSummaryReady] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showResponsabiliModal, setShowResponsabiliModal] = useState(false);
  const responsabiliAnchorRef = useRef<HTMLDivElement | null>(null);
  const [responsabiliPos, setResponsabiliPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [responsabiliOpen, setResponsabiliOpen] = useState(false);
  const [showSportelliModal, setShowSportelliModal] = useState(false);
  const sportelliAnchorRef = useRef<HTMLDivElement | null>(null);
  const [sportelliPos, setSportelliPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [sportelliOpen, setSportelliOpen] = useState(false);
  const [responsabiliBreakdown, setResponsabiliBreakdown] = useState<BreakdownRow[]>([]);
  const [sportelliBreakdown, setSportelliBreakdown] = useState<BreakdownRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [nonRiconciliatePage, setNonRiconciliatePage] = useState(1);
  const [transactionsTotal, setTransactionsTotal] = useState<number | null>(null);
  const [nonRiconciliateTotal, setNonRiconciliateTotal] = useState<number | null>(null);
  const [serverPagingActive, setServerPagingActive] = useState(false);
  const [serviziFiacomReference, setServiziFiacomReference] = useState<number | null>(null);
  const [fatturaDraft, setFatturaDraft] = useState<{
    cliente: string;
    servizio: string[];
    importo: string;
    allegatoNome: string;
  }>({
    cliente: '',
    servizio: [],
    importo: '',
    allegatoNome: '',
  });
  const [serviziDropdownOpen, setServiziDropdownOpen] = useState(false);
  const serviziDropdownRef = useRef<HTMLDivElement | null>(null);
  const [debouncedQ, setDebouncedQ] = useState((filters.q || '').toString());
  const [debouncedCompany, setDebouncedCompany] = useState((filters.company || '').toString());
  const [debouncedResponsabile, setDebouncedResponsabile] = useState((filters.responsabile || '').toString());
  const [debouncedSportello, setDebouncedSportello] = useState((filters.sportello || '').toString());
  const PAGE_SIZE = 5;
  const breakdownCacheRef = useRef(
    new Map<string, { data: { responsabili: BreakdownRow[]; sportelli: BreakdownRow[] }; ts: number }>()
  );
  const summaryCacheRef = useRef(new Map<string, { data: Summary; ts: number }>());
  const txCacheRef = useRef(new Map<string, { data: Transaction[]; total?: number; ts: number }>());
  const nonRicCacheRef = useRef(
    new Map<string, { data: NonRiconciliataItem[]; total?: number; ts: number }>()
  );
  const TX_CACHE_VERSION = 'v3';
  const NON_RIC_CACHE_VERSION = 'v1';
  const CACHE_TTL_MS = 5 * 60_000;

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
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    if (!hasUserInfo && !isAdmin && !isRestrictedView) return [];

    const qTerm = (filters.q || '').toString().trim().toLowerCase();

    return transactions
      .filter((t) => t.account === activeAccount)
      .filter((t) => (filters.type ? t.type === filters.type : true))
      .filter((t) => (filters.status ? t.status === filters.status : true))
      .filter((t) => (filters.from ? new Date(t.date) >= new Date(filters.from) : true))
      .filter((t) => (filters.to ? new Date(t.date) <= new Date(filters.to) : true))
      .filter((t) => {
        if (serverPagingActive) return true;
        if (!qTerm) return true;
        const description = (t.description || '').toLowerCase();
        const companyName =
          (t.companyName ||
            t.company?.companyName ||
            t.company?.businessName ||
            '')?.toLowerCase() || '';
        const responsabile = (t.responsabileName || '').toLowerCase();
        const sportello = (t.sportelloName || '').toLowerCase();
        return (
          description.includes(qTerm) ||
          companyName.includes(qTerm) ||
          responsabile.includes(qTerm) ||
          sportello.includes(qTerm)
        );
      })
      .filter((t) => {
        if (isAdmin || isRestrictedView) return true;
        if (!myUserId) return false;
        return getTxUserId(t) === myUserId;
      });
  }, [transactions, activeAccount, filters, user?._id, serverPagingActive, isRestrictedView, user?.role]);

  const derivedSummary: Summary = useMemo(() => {
    const incoming = filteredTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const outgoing = filteredTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    return {
      balance: incoming + outgoing,
      incoming,
      outgoing: Math.abs(outgoing),
      nonRiconciliateTotal: 0,
      responsabileTotal: 0,
      sportelloTotal: 0,
      totalElav: null,
      fiacomReference: null,
      updatedAt: new Date().toISOString(),
    };
  }, [filteredTx]);

  const summary: Summary = summaryFromApi ?? derivedSummary;
  const loading = summaryLoading || transactionsLoading;

  const onFilterChange = (patch: Partial<ContoFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const getApiFilters = (): ContoFilters => {
    if (activeAccount === 'proselitismo') {
      return {
        ...filters,
        q: '',
        company: debouncedCompany,
        responsabile: debouncedResponsabile,
        sportello: debouncedSportello,
      };
    }
    // Conto servizi: nessun filtro attivo per evitare stale state nascosto.
    return {
      from: '',
      to: '',
      type: '',
      status: '',
      q: '',
      company: '',
      responsabile: '',
      sportello: '',
    };
  };
  const toggleServizioOption = (option: string) => {
    setFatturaDraft((prev) => {
      const exists = prev.servizio.includes(option);
      return {
        ...prev,
        servizio: exists
          ? prev.servizio.filter((item) => item !== option)
          : [...prev.servizio, option],
      };
    });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ((filters.q || '').toString());
    }, 600);
    return () => clearTimeout(timer);
  }, [filters.q]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!serviziDropdownRef.current) return;
      if (!serviziDropdownRef.current.contains(event.target as Node)) {
        setServiziDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCompany((filters.company || '').toString());
      setDebouncedResponsabile((filters.responsabile || '').toString());
      setDebouncedSportello((filters.sportello || '').toString());
    }, 600);
    return () => clearTimeout(timer);
  }, [filters.company, filters.responsabile, filters.sportello]);

  const readCached = <T,>(key: string) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data: T; ts: number };
      if (!parsed?.ts || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writeCached = <T,>(key: string, data: T) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch {
      // ignore cache write errors (quota/private mode)
    }
  };

  useEffect(() => {
    if (activeAccount !== 'proselitismo') return;
    if (!summaryFromApi) return;
    const fiacomValue = Number(summaryFromApi.balance || 0);
    if (Number.isFinite(fiacomValue)) {
      setServiziFiacomReference(fiacomValue);
    }
  }, [activeAccount, summaryFromApi]);

  useEffect(() => {
    try {
      let bestTs = 0;
      let bestValue: number | null = null;
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const key = sessionStorage.key(i);
        if (!key || !key.startsWith('conto:summary:')) continue;
        const suffix = key.replace('conto:summary:', '');
        let parsedKey: any = null;
        try {
          parsedKey = JSON.parse(suffix);
        } catch {
          parsedKey = null;
        }
        if (!parsedKey || parsedKey.account !== 'proselitismo') continue;
        const raw = sessionStorage.getItem(key);
        if (!raw) continue;
        const payload = JSON.parse(raw) as { ts?: number; data?: { balance?: number } };
        const ts = Number(payload?.ts || 0);
        const value = Number(payload?.data?.balance || 0);
        if (ts > bestTs && Number.isFinite(value)) {
          bestTs = ts;
          bestValue = value;
        }
      }
      if (bestValue !== null) setServiziFiacomReference(bestValue);
    } catch {
      // ignore cache bootstrap errors
    }
  }, []);

  // Fetch summary first (fast path for the cards)
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      if (!cancelled) setSummaryReady(false);
      setSummaryLoading(true);
      try {
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        const userIdForQuery = isAdmin ? undefined : user?._id;
        const apiFilters = getApiFilters();
        const cacheKey = JSON.stringify({
          account: activeAccount,
          filters: apiFilters,
          userId: userIdForQuery || '',
        });
        const cached = summaryCacheRef.current.get(cacheKey);
        const now = Date.now();
        if (cached && now - cached.ts < CACHE_TTL_MS) {
          if (!cancelled) setSummaryFromApi(cached.data);
          if (!cancelled) setSummaryLoading(false);
          return;
        }
        const cachedStorage = readCached<Summary>(`conto:summary:${cacheKey}`);
        if (cachedStorage) {
          summaryCacheRef.current.set(cacheKey, cachedStorage);
          if (!cancelled) setSummaryFromApi(cachedStorage.data);
          if (!cancelled) setSummaryLoading(false);
        }
        const sum = await contoService.getSummary(activeAccount, apiFilters, userIdForQuery, controller.signal);
        if (sum) {
          summaryCacheRef.current.set(cacheKey, { data: sum, ts: now });
          writeCached(`conto:summary:${cacheKey}`, sum);
        }
        if (!cancelled) setSummaryFromApi(sum);
      } catch (e: any) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
        if (!cancelled) setSummaryFromApi(null);
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
          setSummaryReady(true);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [activeAccount, filters.from, filters.to, filters.type, filters.status, debouncedQ, debouncedCompany, debouncedResponsabile, debouncedSportello]);

  // Fetch transactions (table can load after the cards)
  useEffect(() => {
    if (!summaryReady) return;
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      setTransactionsLoading(true);
      setError(null);
      try {
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        const userIdForQuery = isAdmin ? undefined : user?._id;
        const apiFilters = getApiFilters();
        const metaKey = JSON.stringify({
          account: activeAccount,
          filters: apiFilters,
          userId: userIdForQuery || '',
          v: TX_CACHE_VERSION,
        });
        const cacheKey = JSON.stringify({
          account: activeAccount,
          filters: apiFilters,
          userId: userIdForQuery || '',
          page: currentPage,
          limit: PAGE_SIZE,
          v: TX_CACHE_VERSION,
        });
        const totalMeta = readCached<{ total?: number | string }>(`conto:tx:meta:${metaKey}`);
        if (totalMeta?.data?.total !== undefined && totalMeta?.data?.total !== null) {
          const metaTotal = Number(totalMeta.data.total);
          if (Number.isFinite(metaTotal)) setTransactionsTotal(metaTotal);
        }
        const cached = txCacheRef.current.get(cacheKey);
        const now = Date.now();
        if (cached && now - cached.ts < CACHE_TTL_MS) {
          if (!cancelled) {
            setTransactions(cached.data);
            if (typeof cached.total === 'number') setTransactionsTotal(cached.total);
            setServerPagingActive(true);
          }
          if (!cancelled) setTransactionsLoading(false);
        }
        const cachedStorage = readCached<{ transactions: Transaction[]; total?: number | string }>(
          `conto:tx:${cacheKey}`
        );
        if (cachedStorage) {
          const txCached = cachedStorage.data?.transactions ?? [];
          const totalCachedRaw = cachedStorage.data?.total;
          const totalCached =
            totalCachedRaw === undefined || totalCachedRaw === null
              ? undefined
              : Number(totalCachedRaw);
          txCacheRef.current.set(cacheKey, { data: txCached, total: totalCached, ts: cachedStorage.ts });
          if (!cancelled) {
            setTransactions(txCached);
            if (Number.isFinite(totalCached)) setTransactionsTotal(totalCached as number);
            setServerPagingActive(true);
          }
          if (!cancelled) setTransactionsLoading(false);
        }
        const res = await contoService.getTransactions(
          activeAccount,
          apiFilters,
          userIdForQuery,
          currentPage,
          PAGE_SIZE,
          controller.signal,
          true
        );
        const tx = res.transactions || [];
        txCacheRef.current.set(cacheKey, { data: tx, total: res.total, ts: now });
        writeCached(`conto:tx:${cacheKey}`, { transactions: tx, total: res.total });
          if (!cancelled) {
            setTransactions(tx);
            const totalValue =
              res.total === undefined || res.total === null ? undefined : Number(res.total);
            if (Number.isFinite(totalValue)) setTransactionsTotal(totalValue as number);
            setServerPagingActive(true);
          }
          if (res.total !== undefined && res.total !== null) {
            writeCached(`conto:tx:meta:${metaKey}`, { total: res.total });
          }

          // Prefetch next page for snappier pagination navigation.
          if ((currentPage === 1) && Number(res.total || 0) > PAGE_SIZE) {
            const nextPage = 2;
            const nextCacheKey = JSON.stringify({
              account: activeAccount,
              filters: apiFilters,
              userId: userIdForQuery || '',
              page: nextPage,
              limit: PAGE_SIZE,
              v: TX_CACHE_VERSION,
            });
            const inMem = txCacheRef.current.get(nextCacheKey);
            const inStorage = readCached<{ transactions: Transaction[]; total?: number | string }>(
              `conto:tx:${nextCacheKey}`
            );
            if (!inMem && !inStorage) {
              contoService
                .getTransactions(
                  activeAccount,
                  apiFilters,
                  userIdForQuery,
                  nextPage,
                  PAGE_SIZE,
                  undefined,
                  true
                )
                .then((nextRes) => {
                  const nextTx = nextRes.transactions || [];
                  txCacheRef.current.set(nextCacheKey, {
                    data: nextTx,
                    total: nextRes.total,
                    ts: Date.now(),
                  });
                  writeCached(`conto:tx:${nextCacheKey}`, {
                    transactions: nextTx,
                    total: nextRes.total,
                  });
                })
                .catch(() => {
                  // ignore prefetch errors
                });
            }
          }
      } catch (e: any) {
        if (e?.name === 'CanceledError' || e?.code === 'ERR_CANCELED') return;
        console.warn('getTransactions failed, using mock fallback', e?.message || e);
        const tx = mockTx; // fallback
        if (!cancelled) {
          setTransactions(tx);
          setServerPagingActive(false);
        }
        setError('Dati non disponibili, mostrati valori di esempio.');
      } finally {
        if (!cancelled) setTransactionsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [summaryReady, activeAccount, filters.from, filters.to, filters.type, filters.status, debouncedQ, debouncedCompany, debouncedResponsabile, debouncedSportello, currentPage]);

  useEffect(() => {
    if (!summaryReady) return;
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      try {
        const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
        const userIdForQuery = isAdmin ? undefined : user?._id;
        const apiFilters = getApiFilters();
        const cacheKey = JSON.stringify({
          account: activeAccount,
          filters: apiFilters,
          userId: userIdForQuery || '',
          page: nonRiconciliatePage,
          limit: PAGE_SIZE,
          v: NON_RIC_CACHE_VERSION,
        });
        const cached = nonRicCacheRef.current.get(cacheKey);
        const now = Date.now();
        if (cached && now - cached.ts < CACHE_TTL_MS) {
          if (!cancelled) {
            setNonRiconciliate(cached.data);
            if (typeof cached.total === 'number') setNonRiconciliateTotal(cached.total);
          }
        }
        const cachedStorage = readCached<{ items: NonRiconciliataItem[]; total?: number | string }>(
          `conto:nonric:${cacheKey}`
        );
        if (cachedStorage) {
          const itemsCached = cachedStorage.data?.items ?? [];
          const totalCachedRaw = cachedStorage.data?.total;
          const totalCached =
            totalCachedRaw === undefined || totalCachedRaw === null
              ? undefined
              : Number(totalCachedRaw);
          nonRicCacheRef.current.set(cacheKey, { data: itemsCached, total: totalCached, ts: cachedStorage.ts });
          if (!cancelled) {
            setNonRiconciliate(itemsCached);
            if (Number.isFinite(totalCached)) setNonRiconciliateTotal(totalCached as number);
          }
        }
        const res = await getNonRiconciliate(
          activeAccount,
          apiFilters,
          userIdForQuery,
          nonRiconciliatePage,
          PAGE_SIZE,
          controller.signal
        );
        nonRicCacheRef.current.set(cacheKey, {
          data: res.items || [],
          total: typeof res.total === 'number' ? res.total : undefined,
          ts: now,
        });
        writeCached(`conto:nonric:${cacheKey}`, { items: res.items || [], total: res.total });
        if (!cancelled) {
          setNonRiconciliate(res.items || []);
          if (typeof res.total === 'number') setNonRiconciliateTotal(res.total);
        }
      } catch (e) {
        // Ignore aborted requests while typing.
        const err: any = e;
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        if (!cancelled) setNonRiconciliate([]);
      }
    };
    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [summaryReady, activeAccount, filters.from, filters.to, debouncedQ, debouncedCompany, debouncedResponsabile, debouncedSportello, user?._id, user?.role, nonRiconciliatePage]);

  useEffect(() => {
    let cancelled = false;
    const loadImports = async () => {
      if (activeAccount !== 'proselitismo') {
        if (!cancelled) setImports([]);
        return;
      }
      try {
        const data = await getContoImports(activeAccount);
        if (!cancelled) setImports(data);
      } catch (e) {
        if (!cancelled) setImports([]);
      }
    };
    loadImports();
    return () => { cancelled = true; };
  }, [activeAccount]);

  useEffect(() => {
    let cancelled = false;
    const loadCompanies = async () => {
      try {
        const data = await getCompanies();
        if (!cancelled) setCompanies(data);
      } catch (e) {
        if (!cancelled) setCompanies([]);
      }
    };
    loadCompanies();
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

  const movementsTitle =
    activeAccount === 'proselitismo' ? 'Proselitismo Agenti e Consulenti' : 'Movimenti';

  const companiesByKey = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => {
      const name = c.companyName || c.businessName || c.name || '';
      if (name) map.set(normalizeCompanyKey(name), c);
      if (c.matricola) {
        c.matricola
          .split(/\s+|,|;|\//)
          .map((token) => token.trim())
          .filter(Boolean)
          .forEach((token) => map.set(normalizeCompanyKey(token), c));
      }
    });
    return map;
  }, [companies]);

  const companiesById = useMemo(() => {
    const map = new Map<string, Company>();
    companies.forEach((c) => {
      if (c._id) map.set(c._id, c);
    });
    return map;
  }, [companies]);

  const isServerPaged = serverPagingActive || transactionsTotal !== null;
  // Backend may return 3 rows per importKey (fiacom/responsabile/sportello).
  // We aggregate to 1 row for the UI only when NOT using server-side pagination.
  const displayTx = useMemo(() => {
    if (activeAccount !== 'proselitismo') return filteredTx;
    if (isServerPaged) return filteredTx;
    const byKey = new Map<string, Transaction>();
    filteredTx.forEach((t, index) => {
      const fallbackKey = t.importKey || t._id || `${t.date}-${index}`;
      if (!byKey.has(fallbackKey)) {
        byKey.set(fallbackKey, t);
      }
    });
    return Array.from(byKey.values());
  }, [filteredTx, activeAccount, isServerPaged]);

  useEffect(() => {
    setCurrentPage(1);
    setTransactionsTotal(null);
  }, [activeAccount, filters.from, filters.to, filters.type, filters.status, debouncedQ, debouncedCompany, debouncedResponsabile, debouncedSportello]);

  useEffect(() => {
    setCurrentPage(1);
    setTransactionsTotal(null);
  }, [filters.q, filters.company, filters.responsabile, filters.sportello]);

  useEffect(() => {
    setNonRiconciliatePage(1);
    setNonRiconciliateTotal(null);
  }, [activeAccount, filters.from, filters.to, debouncedQ, debouncedCompany, debouncedResponsabile, debouncedSportello]);

  useEffect(() => {
    setNonRiconciliatePage(1);
    setNonRiconciliateTotal(null);
  }, [filters.q, filters.company, filters.responsabile, filters.sportello]);

  const totalForPaging =
    transactionsTotal ??
    (isServerPaged ? 0 : displayTx.length);
  const totalPages = Math.max(1, Math.ceil((totalForPaging || 0) / PAGE_SIZE));
  const pagedTx = useMemo(() => displayTx, [displayTx]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    const pages: number[] = [];
    const start = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    const end = Math.min(totalPages, start + maxButtons - 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  const nonRiconciliateTotalForPaging =
    nonRiconciliateTotal ??
    nonRiconciliate.length;
  const nonRiconciliateTotalPages = Math.max(
    1,
    Math.ceil((nonRiconciliateTotalForPaging || 0) / PAGE_SIZE)
  );
  const pagedNonRiconciliate = useMemo(() => nonRiconciliate, [nonRiconciliate]);

  const nonRiconciliatePageNumbers = useMemo(() => {
    const maxButtons = 5;
    const pages: number[] = [];
    const start = Math.max(1, nonRiconciliatePage - Math.floor(maxButtons / 2));
    const end = Math.min(nonRiconciliateTotalPages, start + maxButtons - 1);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  }, [nonRiconciliatePage, nonRiconciliateTotalPages]);

  const loadBreakdown = async () => {
    if (activeAccount !== 'proselitismo') return;
    try {
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
      const userIdForQuery = isAdmin ? undefined : user?._id;
      const cacheKey = JSON.stringify({
        account: activeAccount,
        filters,
        userId: userIdForQuery || '',
      });
      const cached = breakdownCacheRef.current.get(cacheKey);
      const now = Date.now();
      if (cached && now - cached.ts < CACHE_TTL_MS) {
        setResponsabiliBreakdown(cached.data.responsabili || []);
        setSportelliBreakdown(cached.data.sportelli || []);
        return;
      }
      const cachedStorage = readCached<{ responsabili: BreakdownRow[]; sportelli: BreakdownRow[] }>(
        `conto:breakdown:${cacheKey}`
      );
      if (cachedStorage) {
        breakdownCacheRef.current.set(cacheKey, cachedStorage);
        setResponsabiliBreakdown(cachedStorage.data.responsabili || []);
        setSportelliBreakdown(cachedStorage.data.sportelli || []);
      }
      const data = await contoService.getBreakdown(activeAccount, filters, userIdForQuery);
      const payload = {
        responsabili: data.responsabili || [],
        sportelli: data.sportelli || [],
      };
      breakdownCacheRef.current.set(cacheKey, { data: payload, ts: now });
      writeCached(`conto:breakdown:${cacheKey}`, payload);
      setResponsabiliBreakdown(payload.responsabili);
      setSportelliBreakdown(payload.sportelli);
    } catch {
      setResponsabiliBreakdown([]);
      setSportelliBreakdown([]);
    } finally {
    }
  };

  useEffect(() => {
    if (activeAccount !== 'proselitismo') {
      setResponsabiliBreakdown([]);
      setSportelliBreakdown([]);
      return;
    }
    // Invalidate cached breakdown when filters change
    setResponsabiliBreakdown([]);
    setSportelliBreakdown([]);
  }, [activeAccount, filters.from, filters.to, filters.type, filters.status, filters.q]);

  const handleResponsabiliClick = () => {
    setShowSportelliModal(false);
    setShowResponsabiliModal(true);
    setResponsabiliOpen(false);
    if (!responsabiliBreakdown.length) loadBreakdown();
  };
  const handleCloseResponsabili = () => setShowResponsabiliModal(false);
  const handleSportelliClick = () => {
    setShowResponsabiliModal(false);
    setShowSportelliModal(true);
    setSportelliOpen(false);
    if (!sportelliBreakdown.length) loadBreakdown();
  };
  const handleCloseSportelli = () => setShowSportelliModal(false);

  useEffect(() => {
    if (!showResponsabiliModal) return;
    const anchor = responsabiliAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const top = rect.bottom + 8;
    const left = rect.left + rect.width / 2;
    const width = rect.width;
    setResponsabiliPos({ top, left, width });
    const raf = requestAnimationFrame(() => setResponsabiliOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [showResponsabiliModal]);

  useEffect(() => {
    if (!showSportelliModal) return;
    const anchor = sportelliAnchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const top = rect.bottom + 8;
    const left = rect.left + rect.width / 2;
    const width = rect.width;
    setSportelliPos({ top, left, width });
    const raf = requestAnimationFrame(() => setSportelliOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [showSportelliModal]);

  const serviziSaldoCard = useMemo(() => {
    if (activeAccount !== 'servizi') return null as null | { label: string; value: number };
    const balanceValue = Number(summary.balance || 0);
    const incomingValue = Number(summary.incoming || 0);
    const responsabileValue = Number(summary.responsabileTotal || 0);
    const sportelloValue = Number(summary.sportelloTotal || 0);
    const pickScopedValue = (...values: number[]) => {
      const firstNonZero = values.find((v) => Number.isFinite(v) && Math.abs(v) > 0);
      if (firstNonZero !== undefined) return firstNonZero;
      return values.find((v) => Number.isFinite(v)) ?? 0;
    };
    if (isSportello) {
      return {
        label: 'Saldo Sportello',
        value: pickScopedValue(sportelloValue, balanceValue, incomingValue),
      };
    }
    if (isResponsabile) {
      return {
        label: 'Saldo Responsabile',
        value: pickScopedValue(responsabileValue, balanceValue, incomingValue),
      };
    }
    const fiacomReferenceValue = Number(summary.fiacomReference ?? serviziFiacomReference ?? 0);
    return {
      label: 'Saldo FIACOM (80%)',
      value: pickScopedValue(fiacomReferenceValue, balanceValue, incomingValue),
    };
  }, [activeAccount, isSportello, isResponsabile, summary.balance, summary.incoming, summary.responsabileTotal, summary.sportelloTotal, summary.fiacomReference, serviziFiacomReference]);

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
      {(user?.role === 'admin' || user?.role === 'super_admin') && activeAccount === 'servizi' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => navigate(`/conto/upload?account=${activeAccount}`)}
            style={{
              border: '1px solid #2563eb',
              background: '#2563eb',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Carica file Conto Servizi
          </button>
        </div>
      )}

      <div className="projects-section conto-summaries" style={{ marginBottom: 20 }}>
        {activeAccount === 'servizi' && serviziSaldoCard ? (
          <div className="project-card-dash conto-saldo-card">
            <div className="project-number">{formatCurrency(serviziSaldoCard.value)}</div>
            <div className="project-title">{serviziSaldoCard.label}</div>
          </div>
        ) : isSportello ? (
          <>
            <div className="project-card-dash conto-saldo-card">
              <div className="project-number">{formatCurrency(summary.balance || 0)}</div>
              <div className="project-title">Saldo Sportello</div>
            </div>
            {activeAccount === 'proselitismo' && (
              <div className="project-card-dash conto-saldo-card">
                <div className="project-number">{formatCurrency(summary.nonRiconciliateTotal || 0)}</div>
                <div className="project-title">Quote non riconciliate</div>
              </div>
            )}
          </>
        ) : isResponsabile ? (
          <>
            <div className="project-card-dash conto-saldo-card">
              <div className="project-number">{formatCurrency(summary.responsabileTotal || 0)}</div>
              <div className="project-title">Saldo Responsabile</div>
            </div>
            <div
              className="project-card-dash conto-saldo-card"
              ref={sportelliAnchorRef}
              role="button"
              tabIndex={0}
              onClick={handleSportelliClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSportelliClick();
              }}
              title="Vedi dettaglio quote sportelli"
              style={{ cursor: 'pointer' }}
            >
              <div className="project-number">{formatCurrency(summary.sportelloTotal || 0)}</div>
              <div className="project-title">Saldo Sportelli</div>
            </div>
            {activeAccount === 'proselitismo' && (
              <div className="project-card-dash conto-saldo-card">
                <div className="project-number">{formatCurrency(summary.nonRiconciliateTotal || 0)}</div>
                <div className="project-title">Quote non riconciliate</div>
              </div>
            )}
          </>
        ) : (
          <>
            {/*
              totalElav can be null if API didn't return it (fallback to derived).
              In that case, approximate from balance (80%) for display only.
            */}
            {activeAccount === 'proselitismo' &&
              (() => {
                const rawElav =
                  summary.totalElav ??
                  (activeAccount === 'proselitismo' && summary.balance
                    ? summary.balance / 0.8
                    : 0);
                return (
                  <div className="project-card-dash conto-saldo-card">
                    <div className="conto-saldo-meta">Quota ELAV totale</div>
                    <div className="project-number">{formatCurrency(Number(rawElav))}</div>
                    <div className="conto-saldo-meta">FIACOM (80%)</div>
                    <div className="conto-saldo-sub">{formatCurrency(summary.balance)}</div>
                  </div>
                );
              })()}
            <div
              className="project-card-dash conto-saldo-card"
              ref={responsabiliAnchorRef}
              role="button"
              tabIndex={0}
              onClick={handleResponsabiliClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleResponsabiliClick();
              }}
              title="Vedi dettaglio quote responsabili"
              style={{ cursor: 'pointer' }}
            >
              <div className="project-number">{formatCurrency(summary.responsabileTotal || 0)}</div>
              <div className="project-title">Saldo Responsabili</div>
            </div>
            <div
              className="project-card-dash conto-saldo-card"
              ref={sportelliAnchorRef}
              role="button"
              tabIndex={0}
              onClick={handleSportelliClick}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSportelliClick();
              }}
              title="Vedi dettaglio quote sportelli"
              style={{ cursor: 'pointer' }}
            >
              <div className="project-number">{formatCurrency(summary.sportelloTotal || 0)}</div>
              <div className="project-title">Saldo Sportelli</div>
            </div>
            {activeAccount === 'proselitismo' && (
              <div className="project-card-dash conto-saldo-card">
                <div className="project-number">{formatCurrency(summary.nonRiconciliateTotal || 0)}</div>
                <div className="project-title">Quote non riconciliate</div>
              </div>
            )}
            <div className="project-card-dash conto-saldo-card">
              <div className="project-number">{formatCurrency(summary.outgoing)}</div>
              <div className="project-title">Uscite</div>
            </div>
          </>
        )}
      </div>

      <div
        className={`utility-section ${activeAccount === 'servizi' ? 'conto-fattura-section' : ''}`}
        style={{ marginBottom: 20 }}
      >
        <div className="section-header">{activeAccount === 'servizi' ? 'Fattura' : 'Filtri'}</div>
        {activeAccount === 'proselitismo' ? (
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
            <>
              <div className="filter-field">
                <label className="filter-label">Azienda</label>
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Nome azienda..."
                  value={filters.company || ''}
                  onChange={(e) => onFilterChange({ company: e.target.value })}
                />
              </div>
              <div className="filter-field">
                <label className="filter-label">Responsabile</label>
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Responsabile territoriale..."
                  value={filters.responsabile || ''}
                  onChange={(e) => onFilterChange({ responsabile: e.target.value })}
                />
              </div>
              <div className="filter-field">
                <label className="filter-label">Sportello Lavoro</label>
                <input
                  className="filter-input"
                  type="text"
                  placeholder="Sportello lavoro..."
                  value={filters.sportello || ''}
                  onChange={(e) => onFilterChange({ sportello: e.target.value })}
                />
              </div>
            </>
          </div>
        ) : (
          <div className="conto-fattura-grid">
            <div className="filter-field conto-fattura-cliente">
              <label className="filter-label">Cliente / Dati Fiacom</label>
              <div className="conto-fiacom-box">
                <div className="conto-fiacom-line">Spett.le</div>
                <div className="conto-fiacom-line conto-fiacom-strong">Fiacom Conapi</div>
                <div className="conto-fiacom-line conto-fiacom-strong">C.F. 96601400581</div>
                <div className="conto-fiacom-line conto-fiacom-strong">VIA NAZIONALE, 172</div>
                <div className="conto-fiacom-line conto-fiacom-strong">00184 ROMA (RM)</div>
                <div className="conto-fiacom-line conto-fiacom-strong">PEC: fiacomconapi@pec.it</div>
              </div>
            </div>
            <div className="filter-field">
              <label className="filter-label">Prodotti / Servizi</label>
              {fatturaDraft.servizio.length > 0 && (
                <div className="conto-servizi-selected">
                  {fatturaDraft.servizio.map((servizio) => (
                    <span key={servizio} className="conto-servizi-chip">
                      {servizio}
                    </span>
                  ))}
                </div>
              )}
              <div className="conto-servizi-dropdown" ref={serviziDropdownRef}>
                <button
                  type="button"
                  className="filter-input conto-servizi-dropdown-trigger"
                  onClick={() => setServiziDropdownOpen((prev) => !prev)}
                >
                  {fatturaDraft.servizio.length > 0
                    ? `${fatturaDraft.servizio.length} selezionati`
                    : 'Seleziona uno o più servizi'}
                </button>
                {serviziDropdownOpen && (
                  <div className="conto-servizi-dropdown-menu">
                    {contoServiziOptions.map((option) => (
                      <label key={option} className="conto-servizi-dropdown-item">
                        <input
                          type="checkbox"
                          checked={fatturaDraft.servizio.includes(option)}
                          onChange={() => toggleServizioOption(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="filter-field">
              <label className="filter-label">Importo</label>
              <input
                className="filter-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={fatturaDraft.importo}
                onChange={(e) =>
                  setFatturaDraft((prev) => ({ ...prev, importo: e.target.value }))
                }
              />
            </div>
            <div className="filter-field">
              <label className="filter-label">Allegato</label>
              <input
                className="filter-input"
                type="file"
                onChange={(e) =>
                  setFatturaDraft((prev) => ({
                    ...prev,
                    allegatoNome: e.target.files?.[0]?.name || '',
                  }))
                }
              />
            </div>
            {fatturaDraft.allegatoNome && (
              <div className="conto-fattura-filename">File selezionato: {fatturaDraft.allegatoNome}</div>
            )}
          </div>
        )}
      </div>

      <div className="utility-section">
        <div className="section-header">{movementsTitle}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Data</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Aziende</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Responsabile Territoriale</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Sportello Lavoro</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Quota ELAV</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Tipo</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Stato</th>
                <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Categoria</th>
              </tr>
            </thead>
            <tbody>
              {pagedTx.map((t, index) => {
                const rawCompanyName =
                  t.companyName ||
                  t.company?.companyName ||
                  t.company?.businessName ||
                  extractCompanyFromDescription(t.description) ||
                  '';
                const matricola = extractMatricolaFromDescription(t.description);
                const companyKey = normalizeCompanyKey(rawCompanyName);
                const companyFromId =
                  t.company?._id ? companiesById.get(t.company._id) : undefined;
                const companyFromList =
                  companyFromId ||
                  (matricola && companiesByKey.get(normalizeCompanyKey(matricola))) ||
                  (companyKey ? companiesByKey.get(companyKey) : undefined);
                const companyName = rawCompanyName || '-';
                const responsabile =
                  t.responsabileName ||
                  companyFromList?.contractDetails?.territorialManager ||
                  '-';
                const sportello =
                  t.sportelloName ||
                  companyFromList?.contactInfo?.laborConsultant ||
                  '-';
                const displayAmount =
                  activeAccount === 'proselitismo' && typeof t.rawAmount === 'number'
                    ? t.rawAmount
                    : t.amount;
                return (
                  <tr key={t.id || t._id || `${t.date}-${index}`} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '8px' }}>{new Date(t.date).toLocaleDateString('it-IT')}</td>
                    <td style={{ padding: '8px' }}>{companyName}</td>
                    <td style={{ padding: '8px' }}>{responsabile}</td>
                    <td style={{ padding: '8px' }}>{sportello}</td>
                    <td style={{ padding: '8px', color: displayAmount < 0 ? '#e74c3c' : '#253676', fontWeight: 600 }}>
                      {formatCurrency(displayAmount)}
                    </td>
                    <td style={{ padding: '8px', textTransform: 'capitalize' }}>{t.type}</td>
                    <td style={{ padding: '8px', textTransform: 'capitalize' }}>{t.status.replace('_', ' ')}</td>
                    <td style={{ padding: '8px' }}>{t.category}</td>
                  </tr>
                );
              })}
              {filteredTx.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 16, color: '#666' }}>Nessun movimento trovato.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{
                border: '1px solid #e2e8f0',
                background: currentPage === 1 ? '#f8fafc' : '#fff',
                color: '#1f2937',
                padding: '6px 10px',
                borderRadius: 8,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              Prev
            </button>
            {pageNumbers.map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                style={{
                  border: page === currentPage ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: page === currentPage ? '#2563eb' : '#fff',
                  color: page === currentPage ? '#fff' : '#1f2937',
                  padding: '6px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{
                border: '1px solid #e2e8f0',
                background: currentPage >= totalPages ? '#f8fafc' : '#fff',
                color: '#1f2937',
                padding: '6px 10px',
                borderRadius: 8,
                cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 600,
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {!isRestrictedView && activeAccount === 'proselitismo' && showResponsabiliModal && responsabiliPos && (
        <div
          role="dialog"
          aria-modal="false"
          onClick={handleCloseResponsabili}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: responsabiliPos.top,
              left: responsabiliPos.left,
              width: Math.min(640, responsabiliPos.width * 1.6),
              maxWidth: '92vw',
              background: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
              border: '1px solid #e2e8f0',
              opacity: responsabiliOpen ? 1 : 0,
              transformOrigin: 'top center',
              transition: 'opacity 180ms ease, transform 200ms ease',
              transform: responsabiliOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-6px)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 14,
                height: 14,
                background: '#fff',
                borderLeft: '1px solid #e2e8f0',
                borderTop: '1px solid #e2e8f0',
                transformOrigin: 'center',
                rotate: '45deg',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #edf2f7',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1f2937' }}>
                Quote Responsabili Territoriali
              </div>
              <button
                type="button"
                onClick={handleCloseResponsabili}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#1f2937',
                  padding: '4px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Chiudi
              </button>
            </div>
            <div style={{ padding: 12, overflow: 'auto', maxHeight: '50vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Responsabile</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Movimenti</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Totale ELAV</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Totale Competenze</th>
                  </tr>
                </thead>
                <tbody>
                  {responsabiliBreakdown.map((row) => (
                    <tr key={row._id || row.name} style={{ borderBottom: '1px solid #f1f1f1' }}>
                      <td style={{ padding: '8px' }}>{row.name || '-'}</td>
                      <td style={{ padding: '8px' }}>{row.count ?? 0}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>
                        {formatCurrency(Number.isFinite(row.rawTotal ?? NaN) ? (row.rawTotal as number) : 0)}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>
                        {formatCurrency(Number.isFinite(row.total) ? row.total : 0)}
                      </td>
                    </tr>
                  ))}
                  {responsabiliBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 12, color: '#666' }}>
                        Nessuna quota responsabili trovata.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAccount === 'proselitismo' && showSportelliModal && sportelliPos && (
        <div
          role="dialog"
          aria-modal="false"
          onClick={handleCloseSportelli}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: sportelliPos.top,
              left: sportelliPos.left,
              width: Math.min(640, sportelliPos.width * 1.6),
              maxWidth: '92vw',
              background: '#fff',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
              border: '1px solid #e2e8f0',
              opacity: sportelliOpen ? 1 : 0,
              transformOrigin: 'top center',
              transition: 'opacity 180ms ease, transform 200ms ease',
              transform: sportelliOpen ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-6px)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: -8,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 14,
                height: 14,
                background: '#fff',
                borderLeft: '1px solid #e2e8f0',
                borderTop: '1px solid #e2e8f0',
                transformOrigin: 'center',
                rotate: '45deg',
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: '1px solid #edf2f7',
              }}
            >
              <div style={{ fontWeight: 700, color: '#1f2937' }}>
                Quote Sportelli Lavoro
              </div>
              <button
                type="button"
                onClick={handleCloseSportelli}
                style={{
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#1f2937',
                  padding: '4px 8px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Chiudi
              </button>
            </div>
            <div style={{ padding: 12, overflow: 'auto', maxHeight: '50vh' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left' }}>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Sportello</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Movimenti</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Totale ELAV</th>
                    <th style={{ padding: '8px', borderBottom: '1px solid #eee' }}>Totale Competenze</th>
                  </tr>
                </thead>
                <tbody>
                  {sportelliBreakdown.map((row) => (
                    <tr key={row._id || row.name} style={{ borderBottom: '1px solid #f1f1f1' }}>
                      <td style={{ padding: '8px' }}>{row.name || '-'}</td>
                      <td style={{ padding: '8px' }}>{row.count ?? 0}</td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>
                        {formatCurrency(Number.isFinite(row.rawTotal ?? NaN) ? (row.rawTotal as number) : 0)}
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600 }}>
                        {formatCurrency(Number.isFinite(row.total) ? row.total : 0)}
                      </td>
                    </tr>
                  ))}
                  {sportelliBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: 12, color: '#666' }}>
                        Nessuna quota sportelli trovata.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeAccount === 'proselitismo' && (
        <div className="utility-section" style={{ marginTop: 20 }}>
          <div className="section-header">Quote non riconciliate</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Data</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Aziende</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Responsabile Territoriale</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Sportello Lavoro</th>
                  <th style={{ padding: '10px 8px', borderBottom: '1px solid #eee' }}>Quota non riconciliata</th>
                </tr>
              </thead>
              <tbody>
                {pagedNonRiconciliate.map((t) => (
                  <tr key={t._id} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td style={{ padding: '8px' }}>{new Date(t.date).toLocaleDateString('it-IT')}</td>
                    <td style={{ padding: '8px' }}>{t.companyName || '-'}</td>
                    <td style={{ padding: '8px' }}>{t.responsabileName || '-'}</td>
                    <td style={{ padding: '8px' }}>{t.sportelloName || '-'}</td>
                    <td style={{ padding: '8px', color: '#e67e22', fontWeight: 600 }}>
                      {formatCurrency(t.amount)}
                    </td>
                  </tr>
                ))}
                {nonRiconciliate.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 16, color: '#666' }}>Nessuna quota non riconciliata.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {nonRiconciliateTotalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '16px 0' }}>
              <button
                type="button"
                onClick={() => setNonRiconciliatePage((p) => Math.max(1, p - 1))}
                disabled={nonRiconciliatePage === 1}
                style={{
                  border: '1px solid #e2e8f0',
                  background: nonRiconciliatePage === 1 ? '#f8fafc' : '#fff',
                  color: '#1f2937',
                  padding: '6px 10px',
                  borderRadius: 8,
                  cursor: nonRiconciliatePage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Prev
              </button>
              {nonRiconciliatePageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setNonRiconciliatePage(page)}
                  style={{
                    border: page === nonRiconciliatePage ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    background: page === nonRiconciliatePage ? '#2563eb' : '#fff',
                    color: page === nonRiconciliatePage ? '#fff' : '#1f2937',
                    padding: '6px 10px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setNonRiconciliatePage((p) => Math.min(nonRiconciliateTotalPages, p + 1))}
                disabled={nonRiconciliatePage >= nonRiconciliateTotalPages}
                style={{
                  border: '1px solid #e2e8f0',
                  background: nonRiconciliatePage >= nonRiconciliateTotalPages ? '#f8fafc' : '#fff',
                  color: '#1f2937',
                  padding: '6px 10px',
                  borderRadius: 8,
                  cursor: nonRiconciliatePage >= nonRiconciliateTotalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {!isSportello && activeAccount === 'proselitismo' && (
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
      )}
    </div>
  );
};

export default Conto;

