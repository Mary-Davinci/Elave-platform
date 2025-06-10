// setupAdmin.js
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "./models/User";

async function setupAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://Platform:Volpe2020!@cluster0.wcvba.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      return;
    }
    
    // Create admin user
    const adminData = {
      username: "admin",
      email: "maryfiacom@gmail.com", 
      password: await bcrypt.hash("mary1234", 10), 
      firstName: "Platform",
      lastName: "Admin",
      organization: "Admin Organization",
      role: "admin"
    };
 
    const adminUser = new User(adminData);
    await adminUser.save();
    
    console.log('Admin user created successfully!');
    console.log('Email:', adminData.email);
    console.log('Username:', adminData.username);
    console.log('Please change the default password after first login');
    
  } catch (error) {
    console.error('Error setting up admin:', error);
  } finally {
    mongoose.connection.close();
  }
}

setupAdmin();