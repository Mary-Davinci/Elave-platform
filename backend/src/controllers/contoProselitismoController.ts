import { CustomRequestHandler } from "../types/express";
import {
  getContoSummary as getContoSummaryShared,
  getContoTransactions as getContoTransactionsShared,
  getNonRiconciliate as getNonRiconciliateShared,
  getContoBreakdown as getContoBreakdownShared,
  getContoImports as getContoImportsShared,
  previewContoFromExcel as previewContoFromExcelShared,
  uploadContoFromExcel as uploadContoFromExcelShared,
  exportContoTransactionsXlsx as exportContoTransactionsXlsxShared,
  exportMonthlyCompanyTotalsXlsx as exportMonthlyCompanyTotalsXlsxShared,
} from "./contoController";

const forceProselitismoAccount = (req: Parameters<CustomRequestHandler>[0]) => {
  req.query = { ...req.query, account: "proselitismo" };
  req.body = { ...(req.body || {}), account: "proselitismo" };
};

export const getContoProselitismoSummary: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return getContoSummaryShared(req, res, next);
};

export const getContoProselitismoTransactions: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return getContoTransactionsShared(req, res, next);
};

export const getContoProselitismoNonRiconciliate: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return getNonRiconciliateShared(req, res, next);
};

export const getContoProselitismoBreakdown: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return getContoBreakdownShared(req, res, next);
};

export const getContoProselitismoImports: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return getContoImportsShared(req, res, next);
};

export const previewContoProselitismoFromExcel: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return previewContoFromExcelShared(req, res, next);
};

export const uploadContoProselitismoFromExcel: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return uploadContoFromExcelShared(req, res, next);
};

export const exportContoProselitismoXlsx: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return exportContoTransactionsXlsxShared(req, res, next);
};

export const exportContoProselitismoMonthlyCompanyXlsx: CustomRequestHandler = async (req, res, next) => {
  forceProselitismoAccount(req);
  return exportMonthlyCompanyTotalsXlsxShared(req, res, next);
};
