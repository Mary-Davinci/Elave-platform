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
  company?: string;
  responsabile?: string;
  sportello?: string;
}

export interface Transaction {
  id: string;
  _id?: string;
  account: AccountType;
  date: string; // ISO yyyy-mm-dd
  description: string;
  amount: number; // positive for entrata, negative for uscita
  rawAmount?: number;
  importKey?: string;
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
  totalElav?: number | null;
  fiacomReference?: number | null;
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
  account?: AccountType;
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

export interface NonRiconciliataItem {
  _id: string;
  account: AccountType;
  amount: number;
  description: string;
  date: string;
  companyName?: string;
  responsabileName?: string;
  sportelloName?: string;
}

export interface ServiziInvoiceRequestPayload {
  selectedServices: string[];
  amount: number;
  attachmentName?: string;
}

export interface BreakdownRow {
  _id?: string;
  name?: string;
  total: number;
  count: number;
  rawTotal?: number;
  fiacomTotal?: number;
}

export interface ContoBreakdownResponse {
  responsabili: BreakdownRow[];
  sportelli: BreakdownRow[];
}

const scopedContoPath = (
  account: AccountType,
  section: 'transactions' | 'summary' | 'breakdown' | 'non-riconciliate' | 'preview' | 'upload' | 'imports'
) => `/api/conto/${account}/${section}`;

export const contoService = {
  async getTransactions(
    account: AccountType,
    filters: ContoFilters,
    userId?: string,
    page?: number,
    limit?: number,
    signal?: AbortSignal,
    lite?: boolean
  ): Promise<{ transactions: Transaction[]; total?: number; page?: number; pageSize?: number }> {
    const params: Record<string, string> = { account };
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.q) params.q = filters.q;
    if (filters.company) params.company = filters.company;
    if (filters.responsabile) params.responsabile = filters.responsabile;
    if (filters.sportello) params.sportello = filters.sportello;
    if (userId) params.userId = userId;
    if (page) params.page = String(page);
    if (limit) params.limit = String(limit);
    if (lite) params.lite = "1";

    let res: any;
    try {
      res = await api.get(scopedContoPath(account, 'transactions'), { params, signal });
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error;
      // Backward compatibility for older backend deployments.
      res = await api.get('/api/conto/transactions', { params, signal });
    }
    // Be forgiving with response shape
    if (Array.isArray(res.data)) {
      return { transactions: res.data as Transaction[] };
    }
    if (Array.isArray(res.data?.transactions)) {
      return {
        transactions: res.data.transactions as Transaction[],
        total: res.data.total,
        page: res.data.page,
        pageSize: res.data.pageSize,
      };
    }
    return { transactions: [] };
  },

  async getSummary(account: AccountType, filters: ContoFilters, userId?: string, signal?: AbortSignal): Promise<Summary | null> {
    const params: Record<string, string> = { account };
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.q) params.q = filters.q;
    if (filters.company) params.company = filters.company;
    if (filters.responsabile) params.responsabile = filters.responsabile;
    if (filters.sportello) params.sportello = filters.sportello;
    if (userId) params.userId = userId;

    let res: any;
    try {
      res = await api.get(scopedContoPath(account, 'summary'), { params, signal });
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error;
      res = await api.get('/api/conto/summary', { params, signal });
    }
    const data = res.data;
    if (!data) return null;
    // Normalize
    const incoming = Number(data.incoming ?? data.totIncoming ?? 0);
    const outgoingRaw = Number(data.outgoing ?? data.totOutgoing ?? 0);
    const balance = Number(data.balance ?? incoming - outgoingRaw);
    const nonRiconciliateTotal = Number(data.nonRiconciliateTotal ?? 0);
    const responsabileTotal = Number(data.responsabileTotal ?? 0);
    const sportelloTotal = Number(data.sportelloTotal ?? 0);
    const totalElav =
      data.totalElav === null || data.totalElav === undefined
        ? null
        : Number(data.totalElav);
    const fiacomReference =
      data.fiacomReference === null || data.fiacomReference === undefined
        ? null
        : Number(data.fiacomReference);
    return {
      balance,
      incoming,
      outgoing: Math.abs(outgoingRaw),
      nonRiconciliateTotal,
      responsabileTotal,
      sportelloTotal,
      totalElav,
      fiacomReference,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  },

  async getBreakdown(account: AccountType, filters: ContoFilters, userId?: string): Promise<ContoBreakdownResponse> {
    const params: Record<string, string> = { account };
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (filters.type) params.type = filters.type;
    if (filters.status) params.status = filters.status;
    if (filters.q) params.q = filters.q;
    if (filters.company) params.company = filters.company;
    if (filters.responsabile) params.responsabile = filters.responsabile;
    if (filters.sportello) params.sportello = filters.sportello;
    if (userId) params.userId = userId;

    let res: any;
    try {
      res = await api.get(scopedContoPath(account, 'breakdown'), { params });
    } catch (error: any) {
      if (error?.response?.status !== 404) throw error;
      res = await api.get('/api/conto/breakdown', { params });
    }
    const data = res.data || {};
    return {
      responsabili: Array.isArray(data.responsabili) ? data.responsabili : [],
      sportelli: Array.isArray(data.sportelli) ? data.sportelli : [],
    };
  },
};

const ensureAccountInFormData = (formData: FormData, account: AccountType): FormData => {
  if (!formData.has('account')) {
    formData.append('account', account);
  }
  return formData;
};

export const previewContoFromExcel = async (
  formData: FormData,
  account: AccountType = 'proselitismo'
): Promise<ContoUploadPreviewResponse> => {
  const payload = ensureAccountInFormData(formData, account);
  let res: any;
  try {
    res = await api.post(scopedContoPath(account, 'preview'), payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    res = await api.post('/api/conto/preview', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  }
  return res.data as ContoUploadPreviewResponse;
};

export const uploadContoFromExcel = async (
  formData: FormData,
  account: AccountType = 'proselitismo'
): Promise<ContoUploadResponse> => {
  const payload = ensureAccountInFormData(formData, account);
  let res: any;
  try {
    res = await api.post(scopedContoPath(account, 'upload'), payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    res = await api.post('/api/conto/upload', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
  }
  return res.data as ContoUploadResponse;
};

export const getContoImports = async (
  account: AccountType = 'proselitismo'
): Promise<ContoImportItem[]> => {
  let res: any;
  try {
    res = await api.get(scopedContoPath(account, 'imports'));
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    res = await api.get('/api/conto/imports', { params: { account } });
  }
  if (Array.isArray(res.data)) return res.data as ContoImportItem[];
  if (Array.isArray(res.data?.imports)) return res.data.imports as ContoImportItem[];
  return [];
};

export const getNonRiconciliate = async (
  account: AccountType,
  filters: ContoFilters,
  userId?: string,
  page?: number,
  limit?: number,
  signal?: AbortSignal
): Promise<{ items: NonRiconciliataItem[]; total?: number; page?: number; pageSize?: number }> => {
  const params: Record<string, string> = { account };
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.q) params.q = filters.q;
  if (filters.company) params.company = filters.company;
  if (filters.responsabile) params.responsabile = filters.responsabile;
  if (filters.sportello) params.sportello = filters.sportello;
  if (userId) params.userId = userId;
  if (page) params.page = String(page);
  if (limit) params.limit = String(limit);
  let res: any;
  try {
    res = await api.get(scopedContoPath(account, 'non-riconciliate'), { params, signal });
  } catch (error: any) {
    if (error?.response?.status !== 404) throw error;
    res = await api.get('/api/conto/non-riconciliate', { params, signal });
  }
  if (Array.isArray(res.data)) return { items: res.data as NonRiconciliataItem[] };
  if (Array.isArray(res.data?.items)) {
    return {
      items: res.data.items as NonRiconciliataItem[],
      total: res.data.total,
      page: res.data.page,
      pageSize: res.data.pageSize,
    };
  }
  return { items: [] };
};

export const createServiziInvoiceRequest = async (
  payload: ServiziInvoiceRequestPayload
): Promise<{ message: string; invoiceId: string }> => {
  const res = await api.post('/api/conto/servizi/invoice-request', payload);
  return res.data as { message: string; invoiceId: string };
};

export const downloadProselitismoReportXlsx = async (
  filters: Pick<ContoFilters, 'from' | 'to' | 'company' | 'responsabile' | 'sportello'>
): Promise<Blob> => {
  const params: Record<string, string> = {};
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.company) params.company = filters.company;
  if (filters.responsabile) params.responsabile = filters.responsabile;
  if (filters.sportello) params.sportello = filters.sportello;

  const res = await api.get('/api/conto/proselitismo/export', {
    params,
    responseType: 'blob',
  });
  return res.data as Blob;
};
