import mongoose, { Document } from "mongoose";
export interface IProjectTemplate extends Document {
    code: string;
    title: string;
    description: string;
    minPrice: number;
    maxPrice: number;
    hours: number;
    category?: string;
    subcategory?: string;
    type?: string;
    isPublic: boolean;
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const ProjectTemplate: mongoose.Model<IProjectTemplate, {}, {}, {}, mongoose.Document<unknown, {}, IProjectTemplate, {}> & IProjectTemplate & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default ProjectTemplate;
