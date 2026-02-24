import { CustomRequestHandler } from "../types/express";
import {
  getContoSummary as getContoSummaryShared,
  getContoTransactions as getContoTransactionsShared,
  getNonRiconciliate as getNonRiconciliateShared,
  getContoBreakdown as getContoBreakdownShared,
  getContoImports as getContoImportsShared,
  previewContoFromExcel as previewContoFromExcelShared,
  uploadContoFromExcel as uploadContoFromExcelShared,
} from "./contoController";
import ServiziInvoiceRequest from "../models/ServiziInvoiceRequest";

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

    const services = Array.isArray(selectedServices)
      ? selectedServices.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    const parsedAmount = Number(amount);

    if (services.length === 0) {
      return res.status(400).json({ error: "Seleziona almeno un servizio" });
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Importo non valido" });
    }

    const invoice = await ServiziInvoiceRequest.create({
      account: "servizi",
      requester: req.user._id,
      requesterRole: req.user.role,
      selectedServices: services,
      amount: parsedAmount,
      attachmentName: String(attachmentName || "").trim() || undefined,
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
