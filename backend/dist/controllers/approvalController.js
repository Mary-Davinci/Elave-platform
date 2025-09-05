"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectItem = exports.approveUser = exports.approveAgente = exports.approveSportelloLavoro = exports.approveCompany = exports.getPendingItems = void 0;
const notificationService_1 = require("../models/notificationService");
const Company_1 = __importDefault(require("../models/Company"));
const sportello_1 = __importDefault(require("../models/sportello"));
const Agenti_1 = __importDefault(require("../models/Agenti"));
const Segnalatore_1 = __importDefault(require("../models/Segnalatore"));
const User_1 = __importDefault(require("../models/User"));
const getPendingItems = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied. Admin privileges required." });
        }
        console.log(' Fetching real pending items from database...');
        const companies = await Company_1.default.find({
            $or: [
                { isApproved: false },
                { pendingApproval: true },
                { isApproved: { $exists: false } }
            ]
        })
            .populate('user', 'username firstName lastName role')
            .sort({ createdAt: -1 })
            .lean();
        const sportelloLavoro = await sportello_1.default.find({
            $or: [
                { isApproved: false },
                { pendingApproval: true },
                { isApproved: { $exists: false } }
            ]
        })
            .populate('user', 'username firstName lastName role')
            .sort({ createdAt: -1 })
            .lean();
        const agenti = await Agenti_1.default.find({
            $or: [
                { isApproved: false },
                { pendingApproval: true },
                { isApproved: { $exists: false } }
            ]
        })
            .populate('user', 'username firstName lastName role')
            .sort({ createdAt: -1 })
            .lean();
        const pendingUsers = await User_1.default.find({
            role: 'segnalatori',
            $or: [
                { isApproved: false },
                { pendingApproval: true },
                { isApproved: { $exists: false } }
            ]
        })
            .sort({ createdAt: -1 })
            .lean();
        const segnalatori = await Segnalatore_1.default.find({
            $or: [
                { isApproved: false },
                { pendingApproval: true },
                { isApproved: { $exists: false } }
            ]
        })
            .populate('user', 'username firstName lastName role')
            .sort({ createdAt: -1 })
            .lean();
        const allSegnalatori = [
            ...pendingUsers.map((user) => ({
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt,
                user: {
                    _id: user._id,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role
                }
            })),
            ...segnalatori.map((seg) => ({
                _id: seg._id,
                firstName: seg.firstName,
                lastName: seg.lastName,
                email: seg.email,
                address: seg.address ? `${seg.address}, ${seg.city} ${seg.postalCode} (${seg.province})` : undefined,
                role: 'segnalatore',
                createdAt: seg.createdAt,
                user: seg.user
            }))
        ];
        const total = companies.length + sportelloLavoro.length + agenti.length + allSegnalatori.length;
        console.log('Real pending items fetched:', {
            companies: companies.length,
            sportelloLavoro: sportelloLavoro.length,
            agenti: agenti.length,
            segnalatori: allSegnalatori.length,
            total
        });
        return res.json({
            companies: companies.map((company) => ({
                _id: company._id,
                businessName: company.businessName || company.companyName || 'Unknown Company',
                vatNumber: company.vatNumber,
                email: company.contactInfo?.email || undefined,
                address: company.address ? {
                    street: company.address.street,
                    city: company.address.city,
                    postalCode: company.address.postalCode,
                    province: company.address.province,
                    country: company.address.country || 'Italy'
                } : undefined,
                user: company.user,
                createdAt: company.createdAt,
                status: 'pending'
            })),
            sportelloLavoro: sportelloLavoro.map((sportello) => ({
                _id: sportello._id,
                businessName: sportello.businessName || 'Unknown Sportello',
                email: sportello.email || undefined,
                address: sportello.address ? {
                    street: sportello.address,
                    city: sportello.city,
                    postalCode: sportello.postalCode,
                    province: sportello.province,
                    country: 'Italy'
                } : undefined,
                role: 'sportello_lavoro',
                user: sportello.user,
                createdAt: sportello.createdAt,
                status: 'pending'
            })),
            agenti: agenti.map((agente) => ({
                _id: agente._id,
                firstName: agente.businessName || 'Unknown Agent',
                lastName: '',
                email: agente.email || undefined,
                role: 'agente',
                address: agente.address ? `${agente.address}, ${agente.city || 'Unknown'} ${agente.postalCode || ''} (${agente.province || 'Unknown'})` : undefined,
                user: agente.user,
                createdAt: agente.createdAt,
                status: 'pending'
            })),
            segnalatori: allSegnalatori,
            total
        });
    }
    catch (err) {
        console.error(" Get pending items error:", err);
        return res.status(500).json({ error: "Server error while fetching pending items" });
    }
};
exports.getPendingItems = getPendingItems;
const approveCompany = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const { id } = req.params;
        console.log('✅ Approving company with real database:', id);
        const company = await Company_1.default.findById(id).populate('user');
        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }
        company.isApproved = true;
        company.pendingApproval = false;
        company.isActive = true;
        company.approvedBy = req.user._id;
        company.approvedAt = new Date();
        await company.save();
        console.log('✅ Company approved successfully in database');
        try {
            const companyName = company.businessName || company.companyName || 'Unknown Company';
            await notificationService_1.NotificationService.notifyAdminsOfPendingApproval({
                title: `Company Approved: ${companyName}`,
                message: `Company "${companyName}" has been approved by ${req.user.firstName} ${req.user.lastName}`,
                type: 'company_pending',
                entityId: company._id.toString(),
                entityName: companyName,
                createdBy: req.user._id.toString(),
                createdByName: `${req.user.firstName} ${req.user.lastName}`
            });
        }
        catch (notificationError) {
            console.error('Failed to send approval notification:', notificationError);
        }
        return res.json({
            message: "Company approved successfully",
            company: {
                _id: company._id,
                businessName: company.businessName || company.companyName,
                status: 'approved'
            }
        });
    }
    catch (err) {
        console.error("❌ Approve company error:", err);
        return res.status(500).json({ error: "Server error while approving company" });
    }
};
exports.approveCompany = approveCompany;
const approveSportelloLavoro = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const { id } = req.params;
        console.log('✅ Approving sportello lavoro with real database:', id);
        const sportello = await sportello_1.default.findById(id).populate('user');
        if (!sportello) {
            return res.status(404).json({ error: "Sportello Lavoro not found" });
        }
        await sportello_1.default.updateOne({ _id: id }, {
            $set: {
                isApproved: true,
                pendingApproval: false,
                isActive: true,
                approvedBy: req.user._id,
                approvedAt: new Date()
            }
        });
        console.log('✅ Sportello Lavoro approved successfully in database');
        try {
            await notificationService_1.NotificationService.notifyAdminsOfPendingApproval({
                title: `Job Center Approved: ${sportello.businessName}`,
                message: `Job Center "${sportello.businessName}" has been approved by ${req.user.firstName} ${req.user.lastName}`,
                type: 'sportello_pending',
                entityId: sportello._id.toString(),
                entityName: sportello.businessName,
                createdBy: req.user._id.toString(),
                createdByName: `${req.user.firstName} ${req.user.lastName}`
            });
        }
        catch (notificationError) {
            console.error('Failed to send approval notification:', notificationError);
        }
        return res.json({
            message: "Sportello Lavoro approved successfully",
            sportello: {
                _id: sportello._id,
                businessName: sportello.businessName,
                status: 'approved'
            }
        });
    }
    catch (err) {
        console.error(" Approve sportello error:", err);
        return res.status(500).json({ error: "Server error while approving sportello" });
    }
};
exports.approveSportelloLavoro = approveSportelloLavoro;
const approveAgente = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const { id } = req.params;
        console.log('Approving agente with real database:', id);
        const agente = await Agenti_1.default.findById(id).populate('user');
        if (!agente) {
            return res.status(404).json({ error: "Agente not found" });
        }
        agente.isApproved = true;
        agente.pendingApproval = false;
        agente.isActive = true;
        agente.approvedBy = req.user._id;
        agente.approvedAt = new Date();
        await agente.save();
        console.log(' Agente approved successfully in database');
        try {
            await notificationService_1.NotificationService.notifyAdminsOfPendingApproval({
                title: `Agent Approved: ${agente.businessName}`,
                message: `Agent "${agente.businessName}" has been approved by ${req.user.firstName} ${req.user.lastName}`,
                type: 'agente_pending',
                entityId: agente._id.toString(),
                entityName: agente.businessName,
                createdBy: req.user._id.toString(),
                createdByName: `${req.user.firstName} ${req.user.lastName}`
            });
        }
        catch (notificationError) {
            console.error('Failed to send approval notification:', notificationError);
        }
        return res.json({
            message: "Agente approved successfully",
            agente: {
                _id: agente._id,
                firstName: agente.businessName,
                lastName: '',
                status: 'approved'
            }
        });
    }
    catch (err) {
        console.error("Approve agente error:", err);
        return res.status(500).json({ error: "Server error while approving agente" });
    }
};
exports.approveAgente = approveAgente;
const approveUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const { id } = req.params;
        console.log(' Approving user/segnalatore with real database:', id);
        let user = await User_1.default.findById(id);
        let segnalatore = null;
        let entityName = '';
        if (user) {
            user.isApproved = true;
            user.pendingApproval = false;
            user.isActive = true;
            user.approvedBy = req.user._id;
            user.approvedAt = new Date();
            await user.save();
            entityName = `${user.firstName || ''} ${user.lastName || ''}` || user.username;
            console.log('✅ User approved successfully in database');
        }
        else {
            segnalatore = await Segnalatore_1.default.findById(id).populate('user');
            if (!segnalatore) {
                return res.status(404).json({ error: "User not found" });
            }
            await Segnalatore_1.default.updateOne({ _id: id }, {
                $set: {
                    isApproved: true,
                    pendingApproval: false,
                    isActive: true,
                    approvedBy: req.user._id,
                    approvedAt: new Date()
                }
            });
            entityName = `${segnalatore.firstName} ${segnalatore.lastName}`;
            console.log(' Segnalatore approved successfully in database');
        }
        // Send notification
        try {
            await notificationService_1.NotificationService.notifyAdminsOfPendingApproval({
                title: `Reporter Approved: ${entityName}`,
                message: `Reporter "${entityName}" has been approved by ${req.user.firstName} ${req.user.lastName}`,
                type: 'segnalatore_pending',
                entityId: id,
                entityName: entityName,
                createdBy: req.user._id.toString(),
                createdByName: `${req.user.firstName} ${req.user.lastName}`
            });
        }
        catch (notificationError) {
            console.error('Failed to send approval notification:', notificationError);
        }
        return res.json({
            message: "User approved successfully",
            user: {
                _id: id,
                firstName: user?.firstName || segnalatore?.firstName,
                lastName: user?.lastName || segnalatore?.lastName,
                username: user?.username,
                status: 'approved'
            }
        });
    }
    catch (err) {
        console.error(" Approve user error:", err);
        return res.status(500).json({ error: "Server error while approving user" });
    }
};
exports.approveUser = approveUser;
const rejectItem = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: "User not authenticated" });
        }
        if (!['admin', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: "Access denied" });
        }
        const { type, id } = req.params;
        const { reason } = req.body;
        console.log(` Rejecting ${type} with real database:`, id);
        let item = null;
        let itemName = '';
        switch (type) {
            case 'company':
                item = await Company_1.default.findById(id);
                if (item) {
                    await Company_1.default.updateOne({ _id: id }, {
                        $set: {
                            isApproved: false,
                            pendingApproval: false,
                            isActive: false,
                            rejectionReason: reason,
                            rejectedBy: req.user._id,
                            rejectedAt: new Date()
                        }
                    });
                    itemName = item.businessName;
                }
                break;
            case 'sportello':
                item = await sportello_1.default.findById(id);
                if (item) {
                    await sportello_1.default.updateOne({ _id: id }, {
                        $set: {
                            isApproved: false,
                            pendingApproval: false,
                            isActive: false,
                            rejectionReason: reason,
                            rejectedBy: req.user._id,
                            rejectedAt: new Date()
                        }
                    });
                    itemName = item.businessName;
                }
                break;
            case 'agente':
                item = await Agenti_1.default.findById(id);
                if (item) {
                    item.isApproved = false;
                    item.pendingApproval = false;
                    item.isActive = false;
                    item.rejectionReason = reason;
                    item.rejectedBy = req.user._id;
                    item.rejectedAt = new Date();
                    await item.save();
                    itemName = item.businessName;
                }
                break;
            case 'user':
                let user = await User_1.default.findById(id);
                if (user) {
                    user.isApproved = false;
                    user.pendingApproval = false;
                    user.isActive = false;
                    user.rejectionReason = reason;
                    user.rejectedBy = req.user._id;
                    user.rejectedAt = new Date();
                    await user.save();
                    const entityName = `${user.firstName || ''} ${user.lastName || ''}` || user.username;
                    item = user;
                }
                else {
                    let segnalatore = await Segnalatore_1.default.findById(id);
                    if (segnalatore) {
                        await Segnalatore_1.default.updateOne({ _id: id }, {
                            $set: {
                                isApproved: false,
                                pendingApproval: false,
                                isActive: false,
                                rejectionReason: reason,
                                rejectedBy: req.user._id,
                                rejectedAt: new Date()
                            }
                        });
                        itemName = `${segnalatore.firstName} ${segnalatore.lastName}`;
                        item = segnalatore;
                    }
                }
                break;
            default:
                return res.status(400).json({ error: "Invalid item type" });
        }
        if (!item) {
            return res.status(404).json({ error: "Item not found" });
        }
        console.log(` ${type} rejected successfully in database`);
        try {
            const notificationType = `${type}_pending`;
            await notificationService_1.NotificationService.notifyAdminsOfPendingApproval({
                title: `${type.charAt(0).toUpperCase() + type.slice(1)} Rejected: ${itemName}`,
                message: `${type.charAt(0).toUpperCase() + type.slice(1)} "${itemName}" has been rejected by ${req.user.firstName} ${req.user.lastName}${reason ? `. Reason: ${reason}` : ''}`,
                type: notificationType,
                entityId: id,
                entityName: itemName,
                createdBy: req.user._id.toString(),
                createdByName: `${req.user.firstName} ${req.user.lastName}`
            });
        }
        catch (notificationError) {
            console.error('Failed to send rejection notification:', notificationError);
        }
        return res.json({
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} rejected successfully`,
            item: {
                _id: id,
                name: itemName,
                status: 'rejected',
                reason: reason || null
            }
        });
    }
    catch (err) {
        console.error(" Reject item error:", err);
        return res.status(500).json({ error: "Server error while rejecting item" });
    }
};
exports.rejectItem = rejectItem;
//# sourceMappingURL=approvalController.js.map