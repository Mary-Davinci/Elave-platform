"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadUtility = exports.initializeUtilities = exports.deleteUtility = exports.addUtility = exports.uploadUtility = exports.getUtilities = exports.uploadMiddleware = void 0;
const Utilities_1 = __importDefault(require("../models/Utilities"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/utilities');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path_1.default.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /pdf|doc|docx|xls|xlsx|txt|zip|rar/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype) ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
            file.mimetype === 'application/vnd.ms-excel' ||
            file.mimetype === 'application/msword' ||
            file.mimetype === 'application/zip' ||
            file.mimetype === 'application/x-rar-compressed';
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only specific file types are allowed!'));
        }
    }
});
exports.uploadMiddleware = upload.single('file');
const getFileType = (file, providedType) => {
    const validTypes = ['form', 'faq', 'manual', 'document', 'spreadsheet', 'other'];
    if (providedType && validTypes.includes(providedType)) {
        return providedType;
    }
    const extension = path_1.default.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;
    if (extension === '.pdf' || mimeType === 'application/pdf') {
        return 'document';
    }
    if (['.doc', '.docx'].includes(extension) ||
        ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(mimeType)) {
        return 'document';
    }
    if (['.xls', '.xlsx'].includes(extension) ||
        ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mimeType)) {
        return 'spreadsheet';
    }
    if (extension === '.txt' || mimeType === 'text/plain') {
        return 'document';
    }
    if (['.zip', '.rar'].includes(extension) ||
        ['application/zip', 'application/x-rar-compressed'].includes(mimeType)) {
        return 'other';
    }
    return 'other';
};
const getUtilities = async (req, res) => {
    try {
        const utilities = await Utilities_1.default.find().sort({ name: 1 });
        return res.json(utilities);
    }
    catch (error) {
        console.error("Get utilities error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.getUtilities = getUtilities;
const uploadUtility = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }
        const { name, type, isPublic, category } = req.body;
        const utilityName = name || req.file.originalname;
        const fileUrl = `/uploads/utilities/${req.file.filename}`;
        const utilityType = getFileType(req.file, type);
        const newUtility = new Utilities_1.default({
            name: utilityName,
            fileUrl: fileUrl,
            type: utilityType,
            isPublic: isPublic !== 'false',
            category: category || 'uncategorized',
        });
        await newUtility.save();
        return res.status(201).json(newUtility);
    }
    catch (error) {
        console.error("Upload utility error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.uploadUtility = uploadUtility;
const addUtility = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        const { name, fileUrl, type, isPublic } = req.body;
        if (!name || !fileUrl || !type) {
            return res.status(400).json({ error: "Name, file URL, and type are required" });
        }
        const validTypes = ['form', 'faq', 'manual', 'document', 'spreadsheet', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid type. Must be one of: ${validTypes.join(', ')}`
            });
        }
        const newUtility = new Utilities_1.default({
            name,
            fileUrl,
            type,
            isPublic: isPublic !== undefined ? isPublic : true
        });
        await newUtility.save();
        return res.status(201).json(newUtility);
    }
    catch (error) {
        console.error("Add utility error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.addUtility = addUtility;
const deleteUtility = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        const { id } = req.params;
        const utility = await Utilities_1.default.findById(id);
        if (!utility) {
            return res.status(404).json({ error: "Utility not found" });
        }
        if (utility.fileUrl.startsWith('/uploads/')) {
            const filePath = path_1.default.join(__dirname, '../../', utility.fileUrl);
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
        }
        await Utilities_1.default.findByIdAndDelete(id);
        return res.json({ message: "Utility deleted successfully" });
    }
    catch (error) {
        console.error("Delete utility error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.deleteUtility = deleteUtility;
const initializeUtilities = async (req, res) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ error: "Admin access required" });
        }
        const existingUtilities = await Utilities_1.default.countDocuments();
        if (existingUtilities > 0) {
            return res.status(200).json({ message: "Utilities already initialized" });
        }
        const defaultUtilities = [
            {
                name: "User Manual",
                fileUrl: "/files/user-manual.pdf",
                type: "manual",
                isPublic: true
            },
            {
                name: "Company Registration Form",
                fileUrl: "/files/company-registration.pdf",
                type: "form",
                isPublic: true
            },
            {
                name: "Frequently Asked Questions",
                fileUrl: "/files/faq.pdf",
                type: "faq",
                isPublic: true
            }
        ];
        await Utilities_1.default.insertMany(defaultUtilities);
        return res.status(201).json({ message: "Utilities initialized successfully" });
    }
    catch (error) {
        console.error("Initialize utilities error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.initializeUtilities = initializeUtilities;
const downloadUtility = async (req, res) => {
    try {
        const { id } = req.params;
        const utility = await Utilities_1.default.findById(id);
        if (!utility) {
            return res.status(404).json({ error: "Utility not found" });
        }
        if (utility.isPublic) {
            return res.json({ fileUrl: utility.fileUrl });
        }
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        return res.json({ fileUrl: utility.fileUrl });
    }
    catch (error) {
        console.error("Download utility error:", error);
        return res.status(500).json({ error: "Server error" });
    }
};
exports.downloadUtility = downloadUtility;
//# sourceMappingURL=utilityController.js.map