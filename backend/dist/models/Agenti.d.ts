import mongoose, { Document } from 'mongoose';
interface FileInfo {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
}
export interface IAgenteDocument extends Document {
    businessName: string;
    vatNumber: string;
    address: string;
    city: string;
    postalCode: string;
    province: string;
    agreedCommission: number;
    email?: string;
    pec?: string;
    signedContractFile?: FileInfo;
    legalDocumentFile?: FileInfo;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    isApproved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    pendingApproval: boolean;
    isActive: boolean;
}
declare const Agente: mongoose.Model<IAgenteDocument, {}, {}, {}, mongoose.Document<unknown, {}, IAgenteDocument, {}> & IAgenteDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Agente;
