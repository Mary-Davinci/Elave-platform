import mongoose, { Document } from "mongoose";
export interface IUtility extends Document {
    name: string;
    fileUrl: string;
    type: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const Utility: mongoose.Model<IUtility, {}, {}, {}, mongoose.Document<unknown, {}, IUtility, {}> & IUtility & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Utility;
