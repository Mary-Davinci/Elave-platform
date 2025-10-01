import mongoose, { Document } from "mongoose";
export interface ICompany extends Document {
    businessName: string;
    companyName: string;
    vatNumber: string;
    fiscalCode?: string;
    matricola?: string;
    inpsCode?: string;
    address: {
        street?: string;
        city?: string;
        postalCode?: string;
        province?: string;
        country?: string;
    };
    contactInfo: {
        phoneNumber?: string;
        mobile?: string;
        email?: string;
        pec?: string;
        referent?: string;
        laborConsultant?: string;
        procurer?: string;
    };
    contractDetails: {
        contractType?: string;
        ccnlType?: string;
        bilateralEntity?: string;
        hasFondoSani?: boolean;
        useEbapPayment?: boolean;
        elavAdhesion?: boolean;
        saluteAmicaAdhesion?: string;
    };
    industry?: string;
    employees?: number;
    signaler?: string;
    actuator?: string;
    isActive: boolean;
    isApproved: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    pendingApproval: boolean;
    territorialManager?: string;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const Company: mongoose.Model<ICompany, {}, {}, {}, mongoose.Document<unknown, {}, ICompany, {}> & ICompany & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Company;
