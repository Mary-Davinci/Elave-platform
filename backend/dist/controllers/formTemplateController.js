"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFormTemplate = exports.downloadFormTemplateByCategory = exports.downloadFormTemplate = exports.uploadFormTemplate = exports.getFormTemplatesByCategory = exports.getFormTemplates = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const FormTemplet_1 = __importDefault(require("../models/FormTemplet"));
const templateStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../uploads/templates');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const { type, category } = req.body;
        const timestamp = Date.now();
        const ext = path_1.default.extname(file.originalname);
        const categoryPrefix = category ? `${category}_` : '';
        cb(null, `${categoryPrefix}${type}_template_${timestamp}${ext}`);
    }
});
const templateUpload = (0, multer_1.default)({
    storage: templateStorage,
    fileFilter: (req, file, cb) => {
        const validExtensions = /\.pdf$|\.doc$|\.docx$/i;
        const hasValidExtension = validExtensions.test(path_1.default.extname(file.originalname).toLowerCase());
        if (hasValidExtension) {
            return cb(null, true);
        }
        else {
            return cb(new Error('Only PDF, DOC, DOCX files are allowed for templates!'));
        }
    }
}).single('template');
const getFormTemplates = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const templates = await FormTemplet_1.default.find().sort({ createdAt: -1 });
        return res.json(templates);
    }
    catch (err) {
        console.error("Get form templates error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getFormTemplates = getFormTemplates;
const getFormTemplatesByCategory = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { category } = req.params;
        if (!category || !['agenti', 'segnalatore'].includes(category)) {
            return res.status(400).json({ error: "Invalid category. Must be 'agenti' or 'segnalatore'" });
        }
        const templates = await FormTemplet_1.default.find({ category }).sort({ createdAt: -1 });
        return res.json(templates);
    }
    catch (err) {
        console.error("Get form templates by category error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getFormTemplatesByCategory = getFormTemplatesByCategory;
const uploadFormTemplate = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const authenticatedReq = req;
        if (!['admin', 'super_admin'].includes(authenticatedReq.user.role)) {
            return res.status(403).json({ error: "Only admins can upload form templates" });
        }
        templateUpload(req, res, async (err) => {
            if (err) {
                console.error("Template upload error:", err);
                return res.status(400).json({ error: err.message });
            }
            const { type, category } = req.body;
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: "No file provided" });
            }
            let validTypes = [];
            if (category === 'agenti') {
                validTypes = ['contract', 'legal'];
            }
            else if (category === 'segnalatore') {
                validTypes = ['contract', 'id'];
            }
            else {
                validTypes = ['contract', 'legal'];
            }
            if (!type || !validTypes.includes(type)) {
                return res.status(400).json({
                    error: `Invalid template type. Must be one of: ${validTypes.join(', ')}`
                });
            }
            try {
                const query = category ? { type, category } : { type };
                const existingTemplate = await FormTemplet_1.default.findOne(query);
                if (existingTemplate) {
                    if (fs_1.default.existsSync(existingTemplate.filePath)) {
                        fs_1.default.unlinkSync(existingTemplate.filePath);
                    }
                    await FormTemplet_1.default.deleteOne(query);
                }
                let templateName = '';
                if (category === 'segnalatore') {
                    templateName = type === 'contract' ? 'Modulo Contratto Segnalatore' : 'Modulo Documento Identità';
                }
                else {
                    templateName = type === 'contract' ? 'Modulo Contratto Agenti' : 'Modulo Documento Legale';
                }
                const newTemplate = new FormTemplet_1.default({
                    name: templateName,
                    type,
                    category: category || 'agenti',
                    fileName: file.filename,
                    originalName: file.originalname,
                    filePath: file.path,
                    mimetype: file.mimetype,
                    size: file.size,
                    uploadedBy: authenticatedReq.user._id
                });
                await newTemplate.save();
                return res.status(201).json({
                    message: "Template uploaded successfully",
                    template: newTemplate
                });
            }
            catch (saveError) {
                console.error("Save template error:", saveError);
                if (fs_1.default.existsSync(file.path)) {
                    fs_1.default.unlinkSync(file.path);
                }
                return res.status(500).json({ error: "Error saving template" });
            }
        });
    }
    catch (err) {
        console.error("Upload template error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.uploadFormTemplate = uploadFormTemplate;
const downloadFormTemplate = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { type } = req.params;
        if (!type || !['contract', 'legal'].includes(type)) {
            return res.status(400).json({ error: "Invalid template type" });
        }
        const template = await FormTemplet_1.default.findOne({
            type,
            $or: [{ category: { $exists: false } }, { category: 'agenti' }]
        });
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        if (!fs_1.default.existsSync(template.filePath)) {
            return res.status(404).json({ error: "Template file not found on server" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${template.originalName}"`);
        res.setHeader('Content-Type', template.mimetype);
        const fileStream = fs_1.default.createReadStream(template.filePath);
        fileStream.pipe(res);
    }
    catch (err) {
        console.error("Download template error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.downloadFormTemplate = downloadFormTemplate;
const downloadFormTemplateByCategory = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const { category, type } = req.params;
        if (!category || !['agenti', 'segnalatore'].includes(category)) {
            return res.status(400).json({ error: "Invalid category. Must be 'agenti' or 'segnalatore'" });
        }
        let validTypes = [];
        if (category === 'agenti') {
            validTypes = ['contract', 'legal'];
        }
        else if (category === 'segnalatore') {
            validTypes = ['contract', 'id'];
        }
        if (!type || !validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid template type for ${category}. Must be one of: ${validTypes.join(', ')}`
            });
        }
        const template = await FormTemplet_1.default.findOne({ type, category });
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        if (!fs_1.default.existsSync(template.filePath)) {
            return res.status(404).json({ error: "Template file not found on server" });
        }
        res.setHeader('Content-Disposition', `attachment; filename="${template.originalName}"`);
        res.setHeader('Content-Type', template.mimetype);
        const fileStream = fs_1.default.createReadStream(template.filePath);
        fileStream.pipe(res);
    }
    catch (err) {
        console.error("Download template by category error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.downloadFormTemplateByCategory = downloadFormTemplateByCategory;
const deleteFormTemplate = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        const authenticatedReq = req;
        if (!['admin', 'super_admin'].includes(authenticatedReq.user.role)) {
            return res.status(403).json({ error: "Only admins can delete form templates" });
        }
        const { type } = req.params;
        const template = await FormTemplet_1.default.findOne({ type });
        if (!template) {
            return res.status(404).json({ error: "Template not found" });
        }
        if (fs_1.default.existsSync(template.filePath)) {
            fs_1.default.unlinkSync(template.filePath);
        }
        await FormTemplet_1.default.deleteOne({ type });
        return res.json({ message: "Template deleted successfully" });
    }
    catch (err) {
        console.error("Delete template error:", err);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteFormTemplate = deleteFormTemplate;
//# sourceMappingURL=formTemplateController.js.map