"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const ContoNonRiconciliataSchema = new mongoose_1.Schema({
    account: {
        type: String,
        enum: ["proselitismo", "servizi"],
        required: true,
        default: "proselitismo",
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true, default: "" },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    company: { type: mongoose_1.Schema.Types.ObjectId, ref: "Company" },
    source: {
        type: String,
        enum: ["manuale", "xlsx"],
        default: "manuale",
    },
    date: { type: Date, default: () => new Date() },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("ContoNonRiconciliata", ContoNonRiconciliataSchema);
//# sourceMappingURL=ContoNonRiconciliata.js.map
