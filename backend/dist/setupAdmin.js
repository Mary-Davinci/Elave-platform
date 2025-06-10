"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// setupAdmin.js
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("./models/User"));
async function setupAdmin() {
    try {
        // Connect to MongoDB
        await mongoose_1.default.connect(process.env.MONGODB_URI || 'mongodb+srv://Platform:Volpe2020!@cluster0.wcvba.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
        // Check if admin already exists
        const existingAdmin = await User_1.default.findOne({ role: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists:', existingAdmin.email);
            return;
        }
        // Create admin user
        const adminData = {
            username: "admin",
            email: "maryfiacom@gmail.com",
            password: await bcryptjs_1.default.hash("mary1234", 10),
            firstName: "Platform",
            lastName: "Admin",
            organization: "Admin Organization",
            role: "admin"
        };
        const adminUser = new User_1.default(adminData);
        await adminUser.save();
        console.log('Admin user created successfully!');
        console.log('Email:', adminData.email);
        console.log('Username:', adminData.username);
        console.log('Please change the default password after first login');
    }
    catch (error) {
        console.error('Error setting up admin:', error);
    }
    finally {
        mongoose_1.default.connection.close();
    }
}
setupAdmin();
//# sourceMappingURL=setupAdmin.js.map