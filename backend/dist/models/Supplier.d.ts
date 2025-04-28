import mongoose, { Document } from "mongoose";
export interface ISupplier extends Document {
    ragioneSociale: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string;
    partitaIva: string;
    codiceFiscale?: string;
    referente: string;
    cellulare: string;
    telefono?: string;
    email: string;
    pec?: string;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const Supplier: mongoose.Model<ISupplier, {}, {}, {}, mongoose.Document<unknown, {}, ISupplier, {}> & ISupplier & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Supplier;
