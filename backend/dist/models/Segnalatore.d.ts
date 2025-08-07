import mongoose, { Document } from 'mongoose';
interface FileInfo {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
}
export interface ISegnalatoreDocument extends Document {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    address: string;
    city: string;
    postalCode: string;
    province: string;
    taxCode: string;
    agreementPercentage: number;
    specialization?: string;
    notes?: string;
    contractFile?: FileInfo;
    idDocumentFile?: FileInfo;
    user: mongoose.Types.ObjectId;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const Segnalatore: mongoose.Model<ISegnalatoreDocument, {}, {}, {}, mongoose.Document<unknown, {}, ISegnalatoreDocument, {}> & ISegnalatoreDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Segnalatore;
