import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    _id: mongoose.Types.ObjectId;
}
declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default User;
