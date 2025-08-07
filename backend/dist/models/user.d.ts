import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    role: "super_admin" | "admin" | "responsabile_territoriale" | "sportello_lavoro" | "segnalatori";
    firstName?: string;
    lastName?: string;
    organization?: string;
    managedBy?: mongoose.Types.ObjectId;
    manages?: mongoose.Types.ObjectId[];
    assignedCompanies?: mongoose.Types.ObjectId[];
    isApproved?: boolean;
    approvedBy?: mongoose.Types.ObjectId;
    approvedAt?: Date;
    pendingApproval?: boolean;
    profitSharePercentage?: number;
    isActive?: boolean;
    permissions?: {
        canViewAll?: boolean;
        canCreateSportello?: boolean;
        canCreateCompanies?: boolean;
        canCreateEmployees?: boolean;
        canCreateSegnalatori?: boolean;
        canRequestRefunds?: boolean;
    };
    _id: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default User;
