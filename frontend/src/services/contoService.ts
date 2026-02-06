import api from './api';

export type AccountType = 'proselitismo' | 'servizi';
export type TransactionType = 'entrata' | 'uscita';
export type TransactionStatus = 'completata' | 'in_attesa' | 'annullata';

export interface ContoFilters {
  from?: string;
  to?: string;
  type?: '' | TransactionType;
  status?: '' | TransactionStatus;
  q?: string;
}

export interface Transaction {
  id: string;
  _id?: string;
  account: AccountType;
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // positive for entrata, negative for uscita
  rawAmount?: number;
  type: TransactionType;
  status: TransactionStatus;
  category: string;
  userId?: string;
  user?: { _id?: string } | string;
  createdBy?: string;
  ownerId?: string;
  companyName?: string;
  responsabileName?: string;
  sportelloName?: string;
  company?: {
    _id?: string;
    companyName?: string;
    businessName?: string;
  };
}

export interface Summary {
  balance: number;
  incoming: number;
  outgoing: number; // absolute value for UI convenience
  nonRiconciliateTotal: number;
  responsabileTotal?: number;
  sportelloTotal?: number;
  updatedAt: string;
}

export interface ContoUploadRow {
  mese?: string;
  anno?: string;
  matricolaInps?: string;
  ragioneSociale?: string;
  nonRiconciliata?: number | string;
  quotaRiconciliata?: number | string;
  fondoSanitario?: number | string;
  quotaFiacom?: number | string;
}

export interface ContoUploadPreviewRow {
  rowNumber: number;
  data?: ContoUploadRow;
  errors?: string[];
}

export interface ContoUploadPreviewResponse {
  preview: ContoUploadPreviewRow[];
  nonRiconciliate?: ContoUploadPreviewRow[];
  errors?: string[];
  fileHash?: string;
  fileAlreadyUploaded?: boolean;
  fileAlreadyUploadedAt?: string;
}

export interface ContoUploadDuplicateRow {
  rowNumber: number;
  reason: string;
  data?: ContoUploadRow;
}

export interface ContoUploadResponse {
  message?: string;
  errors?: string[];
  requiresConfirmation?: boolean;
  duplicates?: ContoUploadDuplicateRow[];
  fileAlreadyUploaded?: boolean;
  fileAlreadyUploadedAt?: string;
}

export interface ContoImportItem {
  _id: string;
  fileHash: string;
  originalName: string;
  uploadedBy: string;
  rowCount: number;
  createdAt: string;
}

export const contoService = {
  async getTransactions(account: AccountType, filters: ContoFilters, userId?: string): Promise<Transaction[]> {
    const params: Record<string, string> = { account };
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.q) params.q = filters.q;
    if (userId) params.userId = userId;

    const res = await api.get('/api/conto/transactions', { params });
    // Be forgiving with response shape
    if (Array.isArray(res.data)) return res.data as Transaction[];
    if (Array.isArray(res.data?.transactions)) return res.data.transactions as Transaction[];
    return [];
  },

  async getSummary(account: AccountType, filters: ContoFilters, userId?: string): Promise<Summary | null> {
    const params: Record<string, string> = { account };
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.q) params.q = filters.q;
    if (userId) params.userId = userId;

    const res = await api.get('/api/conto/summary', { params });
    const data = res.data;
    if (!data) return null;
    // Normalize
    const incoming = Number(data.incoming ?? data.totIncoming ?? 0);
    const outgoingRaw = Number(data.outgoing ?? data.totOutgoing ?? 0);
    const balance = Number(data.balance ?? incoming - outgoingRaw);
    const nonRiconciliateTotal = Number(data.nonRiconciliateTotal ?? 0);
    const responsabileTotal = Number(data.responsabileTotal ?? 0);
    const sportelloTotal = Number(data.sportelloTotal ?? 0);
    return {
      balance,
      incoming,
      outgoing: Math.abs(outgoingRaw),
      nonRiconciliateTotal,
      responsabileTotal,
      sportelloTotal,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  },
};

export const previewContoFromExcel = async (formData: FormData): Promise<ContoUploadPreviewResponse> => {
  const res = await api.post('/api/conto/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return res.data as ContoUploadPreviewResponse;
};

export const uploadContoFromExcel = async (formData: FormData): Promise<ContoUploadResponse> => {
  const res = await api.post('/api/conto/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return res.data as ContoUploadResponse;
};

export const getContoImports = async (): Promise<ContoImportItem[]> => {
  const res = await api.get('/api/conto/imports');
  if (Array.isArray(res.data)) return res.data as ContoImportItem[];
  if (Array.isArray(res.data?.imports)) return res.data.imports as ContoImportItem[];
  return [];
};

