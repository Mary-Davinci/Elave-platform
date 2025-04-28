import mongoose, { Document } from "mongoose";
export interface IAccount extends Document {
    name: string;
    type: "proselitismo" | "servizi";
    balance: number;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const Account: mongoose.Model<IAccount, {}, {}, {}, mongoose.Document<unknown, {}, IAccount, {}> & IAccount & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Account;
