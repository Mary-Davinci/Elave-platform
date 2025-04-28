import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    role: "user" | "attuatore" | "admin";
    firstName?: string;
    lastName?: string;
    organization?: string;
    managedBy?: mongoose.Types.ObjectId;
    manages?: mongoose.Types.ObjectId[];
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
