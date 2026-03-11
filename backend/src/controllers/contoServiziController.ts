import { CustomRequestHandler } from "../types/express";
import {
  getContoSummary as getContoSummaryShared,
  getContoTransactions as getContoTransactionsShared,
  getNonRiconciliate as getNonRiconciliateShared,
  getContoBreakdown as getContoBreakdownShared,
  getContoImports as getContoImportsShared,
  deleteContoImport as deleteContoImportShared,
  previewContoFromExcel as previewContoFromExcelShared,
  uploadContoFromExcel as uploadContoFromExcelShared,
} from "./contoController";
import ServiziInvoiceRequest from "../models/ServiziInvoiceRequest";
import multer from "multer";
import {
  isObjectStorageEnabled,
  getObjectStorageDownloadUrl,
  uploadBufferToObjectStorage,
} from "../services/objectStorage";

const serviziInvoiceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB
  },
});

const sanitizeFileName = (value: string) =>
  String(value || "file")
    .trim()
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, "_");

const buildServiziInvoiceStorageKey = (file: Express.Multer.File) => {
  const now = new Date();
  const dateSegment = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  return `servizi-invoices/${dateSegment}/${Date.now()}-${sanitizeFileName(file.originalname)}`;
};

export const uploadServiziInvoiceAttachment = serviziInvoiceUpload.single("attachment");

const forceServiziAccount = (req: Parameters<CustomRequestHandler>[0]) => {
  req.query = { ...req.query, account: "servizi" };
  req.body = { ...(req.body || {}), account: "servizi" };
};

export const getContoServiziSummary: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return getContoSummaryShared(req, res, next);
};

export const getContoServiziTransactions: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return getContoTransactionsShared(req, res, next);
};

export const getContoServiziNonRiconciliate: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return getNonRiconciliateShared(req, res, next);
};

export const getContoServiziBreakdown: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return getContoBreakdownShared(req, res, next);
};

export const getContoServiziImports: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return getContoImportsShared(req, res, next);
};

export const deleteContoServiziImport: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return deleteContoImportShared(req, res, next);
};

export const previewContoServiziFromExcel: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return previewContoFromExcelShared(req, res, next);
};

export const uploadContoServiziFromExcel: CustomRequestHandler = async (req, res, next) => {
  forceServiziAccount(req);
  return uploadContoFromExcelShared(req, res, next);
};

export const createServiziInvoiceRequest: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { selectedServices, amount, attachmentName } = req.body as {
      selectedServices?: string[];
      amount?: number | string;
      attachmentName?: string;
    };
    const attachmentFile = (req as any).file as Express.Multer.File | undefined;

    let parsedServicesInput: any = selectedServices;
    if (typeof parsedServicesInput === "string") {
      try {
        parsedServicesInput = JSON.parse(parsedServicesInput);
      } catch {
        parsedServicesInput = parsedServicesInput
          .split(",")
          .map((item: string) => item.trim())
          .filter(Boolean);
      }
    }
    const services = Array.isArray(parsedServicesInput)
      ? parsedServicesInput.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const parsedAmount = Number(amount);

    if (services.length === 0) {
      return res.status(400).json({ error: "Seleziona almeno un servizio" });
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Importo non valido" });
    }

    let uploadedAttachmentName: string | undefined = String(attachmentName || "").trim() || undefined;
    let uploadedAttachmentStorageKey: string | undefined;
    let uploadedAttachmentMimeType: string | undefined;
    let uploadedAttachmentSize: number | undefined;

    if (attachmentFile) {
      if (!isObjectStorageEnabled()) {
        return res.status(400).json({
          error:
            "Storage documenti non configurato: impossibile salvare il file. Verifica variabili B2_* nel backend.",
        });
      }
      if (!attachmentFile.buffer) {
        return res.status(400).json({ error: "Caricamento allegato non valido." });
      }

      const storageKey = buildServiziInvoiceStorageKey(attachmentFile);
      await uploadBufferToObjectStorage(
        storageKey,
        attachmentFile.buffer,
        attachmentFile.mimetype || "application/octet-stream"
      );

      uploadedAttachmentName = attachmentFile.originalname || uploadedAttachmentName;
      uploadedAttachmentStorageKey = storageKey;
      uploadedAttachmentMimeType = attachmentFile.mimetype;
      uploadedAttachmentSize = attachmentFile.size;
    }

    const invoice = await ServiziInvoiceRequest.create({
      account: "servizi",
      requester: req.user._id,
      requesterRole: req.user.role,
      selectedServices: services,
      amount: parsedAmount,
      attachmentName: uploadedAttachmentName,
      attachmentStorageKey: uploadedAttachmentStorageKey,
      attachmentMimeType: uploadedAttachmentMimeType,
      attachmentSize: uploadedAttachmentSize,
      status: "pending",
    });

    return res.status(201).json({
      message: "Richiesta fattura inviata in approvazione",
      invoiceId: invoice._id,
    });
  } catch (err: any) {
    console.error("Create servizi invoice request error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getServiziInvoiceAttachmentUrl: CustomRequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { id } = req.params;
    const invoice = await ServiziInvoiceRequest.findById(id).lean();
    if (!invoice) {
      return res.status(404).json({ error: "Richiesta fattura non trovata" });
    }

    const isAdmin = req.user.role === "admin" || req.user.role === "super_admin";
    if (!isAdmin && String(invoice.requester) !== String(req.user._id)) {
      return res.status(403).json({ error: "Non autorizzato ad accedere a questa ricevuta" });
    }

    if (!invoice.attachmentStorageKey) {
      return res.status(404).json({ error: "Nessuna ricevuta allegata per questa richiesta" });
    }

    const url = await getObjectStorageDownloadUrl(String(invoice.attachmentStorageKey), 900);
    return res.json({
      url,
      attachmentName: invoice.attachmentName || null,
      mimeType: invoice.attachmentMimeType || null,
      size: invoice.attachmentSize || null,
    });
  } catch (err: any) {
    console.error("Get servizi invoice attachment url error:", err);
    return res.status(500).json({ error: "Server error while generating attachment url" });
  }
};
