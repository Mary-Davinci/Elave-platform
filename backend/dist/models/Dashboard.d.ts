import mongoose, { Document } from "mongoose";
export interface IDashboardStats extends Document {
    user: mongoose.Types.ObjectId;
    companies: number;
    actuators: number;
    employees: number;
    suppliers: number;
    segnalatori: number;
    unreadMessages: number;
    projectsRequested: number;
    projectsInProgress: number;
    projectsCompleted: number;
    updatedAt: Date;
}
declare const DashboardStats: mongoose.Model<IDashboardStats, {}, {}, {}, mongoose.Document<unknown, {}, IDashboardStats, {}> & IDashboardStats & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default DashboardStats;
