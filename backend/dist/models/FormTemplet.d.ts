import mongoose, { Document } from "mongoose";
export type TemplateType = 'contract' | 'legal' | 'id';
export type TemplateCategory = 'agenti' | 'segnalatore' | 'sportello' | 'sportello-lavoro';
export interface IFormTemplate extends Document {
    name: string;
    type: TemplateType;
    category: TemplateCategory;
    fileName: string;
    originalName: string;
    filePath: string;
    mimetype: string;
    size: number;
    uploadedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<IFormTemplate, {}, {}, {}, mongoose.Document<unknown, {}, IFormTemplate, {}> & IFormTemplate & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
