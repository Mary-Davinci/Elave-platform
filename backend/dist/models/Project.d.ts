import mongoose, { Document } from "mongoose";
export interface IProject extends Document {
    title: string;
    description: string;
    company: mongoose.Types.ObjectId;
    status: 'requested' | 'inProgress' | 'completed';
    startDate: Date | null;
    endDate: Date | null;
    budget: number;
    hours: number;
    templateCode?: string;
    user: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const Project: mongoose.Model<IProject, {}, {}, {}, mongoose.Document<unknown, {}, IProject, {}> & IProject & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default Project;
