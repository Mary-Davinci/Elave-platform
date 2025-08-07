import mongoose, { Document } from 'mongoose';
interface FileInfo {
    filename: string;
    originalName: string;
    path: string;
    mimetype: string;
    size: number;
}
export interface IProcacciatoreDocument extends Document {
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
declare const Procacciatore: mongoose.Model<IProcacciatoreDocument, {}, {}, {}, mongoose.Document<unknown, {}, IProcacciatoreDocument, {}> & IProcacciatoreDocument & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Procacciatore;
