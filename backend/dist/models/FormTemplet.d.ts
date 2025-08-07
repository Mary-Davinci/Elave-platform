import mongoose, { Document } from "mongoose";
export interface IFormTemplate extends Document {
    name: string;
    type: 'contract' | 'legal' | 'id';
    category: 'agenti' | 'segnalatore';
    fileName: string;
    originalName: string;
    filePath: string;
    mimetype: string;
    size: number;
    uploadedBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
declare const FormTemplate: mongoose.Model<IFormTemplate, {}, {}, {}, mongoose.Document<unknown, {}, IFormTemplate, {}> & IFormTemplate & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default FormTemplate;
