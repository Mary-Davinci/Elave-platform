import mongoose, { Document } from 'mongoose';
export interface IEmployee extends Document {
    _id: mongoose.Types.ObjectId;
    companyId: mongoose.Types.ObjectId;
    nome: string;
    cognome: string;
    dataNascita: string;
    cittaNascita: string;
    provinciaNascita: string;
    genere: 'M' | 'F' | 'A';
    codiceFiscale: string;
    indirizzo: string;
    numeroCivico: string;
    citta: string;
    provincia: string;
    cap: string;
    cellulare?: string;
    telefono?: string;
    email?: string;
    stato: 'attivo' | 'inattivo';
    createdAt?: Date;
    updatedAt?: Date;
}
declare const _default: mongoose.Model<IEmployee, {}, {}, {}, mongoose.Document<unknown, {}, IEmployee, {}> & IEmployee & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default _default;
