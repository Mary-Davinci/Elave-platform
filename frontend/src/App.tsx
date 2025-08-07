// src/App.tsx - Fixed routing section
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Companies from './pages/Companies';
import NewCompany from './pages/NewCompany';
import Projects from './pages/Projects';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import InArrivo from './pages/InArrivo';
import NuovoMessaggio from './pages/NuovoMessaggio';
import MessageDetail from './pages/MessageDetail';
import EditCompany from './pages/EditCompany';
import CompanyDetail from './pages/CompanyDetail';
import UploadCompanies from './pages/UploadCompanies';
import Agenti from './pages/Agenti';
import ProjectDetails from './pages/ProjectDetails';
import Suppliers from './pages/Suppliers';
import CreateSupplier from './pages/CreateSupplier';
import EditSupplier from './pages/EditSupplier';
import UserProfile from './pages/UserProfile';
import ChangePasswordPage from './pages/ChangePasswordPage';
import SportelloLavoro from './pages/CreateSportello';
import SportelloLavoroList from './pages/SportelloLavoroList';
import SegnalatoreForm from './pages/SegnalatoreForm';
import SegnalatoreList from './pages/SegnalatoriList';
 import ProcacciatoriList from './pages/ProcacciatoriList';
 import ProcacciatoreForm from './pages/ProcacciatoreForm';
 import ApprovalsPage from './pages/ApprovalsPage';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes without layout */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes with MainLayout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* Companies routes */}
          <Route path="/companies" element={
            <ProtectedRoute>
              <MainLayout>
                <Companies />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/companies/new" element={
            <ProtectedRoute>
              <MainLayout>
                <NewCompany />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/companies/edit/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <EditCompany />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/companies/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <CompanyDetail />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/companies/upload" element={
            <ProtectedRoute>
              <MainLayout>
                <UploadCompanies />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* Projects routes */}
          <Route path="/projects" element={
            <ProtectedRoute>
              <MainLayout>
                <Projects />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* Abila routes */}
          <Route path="/agenti" element={
            <ProtectedRoute>
              <MainLayout>
                <Agenti />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/abila/progetti" element={
            <ProtectedRoute>
              <MainLayout>
                <Projects />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/abila/progetto/details" element={
            <ProtectedRoute>
              <MainLayout>
                <ProjectDetails />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* Users routes */}
          <Route path="/users" element={
            <ProtectedRoute>
              <MainLayout>
                <Users />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/users/create" element={
            <ProtectedRoute>
              <MainLayout>
                <Users />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* Email routes */}
          <Route path="/posta/in-arrivo" element={
            <ProtectedRoute>
              <MainLayout>
                <InArrivo />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/posta/nuovo" element={
            <ProtectedRoute>
              <MainLayout>
                <NuovoMessaggio />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/posta/bozza/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <NuovoMessaggio />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/posta/messaggio/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <MessageDetail />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          {/* Fornitori routes */}
          <Route path="/fornitori" element={
            <ProtectedRoute>
              <MainLayout>
                <Suppliers />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/fornitori/crea" element={
            <ProtectedRoute>
              <MainLayout>
                <CreateSupplier />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/fornitori/edit/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <EditSupplier />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* FIXED: Sportello Lavoro routes */}
          <Route path="/sportello-lavoro" element={
            <ProtectedRoute>
              <MainLayout>
                <SportelloLavoroList />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/sportello-lavoro/new" element={
            <ProtectedRoute>
              <MainLayout>
                <SportelloLavoro />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* TODO: Add these when you create the components */}
          {/*
          <Route path="/sportello-lavoro/edit/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <EditSportelloLavoro />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/sportello-lavoro/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <SportelloLavoroDetail />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/sportello-lavoro/upload" element={
            <ProtectedRoute>
              <MainLayout>
                <UploadSportelloLavoro />
              </MainLayout>
            </ProtectedRoute>
          } />
          */}

          {/* FIXED: Segnalatori routes */}
          <Route path="/segnalatori" element={
            <ProtectedRoute>
              <MainLayout>
                <SegnalatoreList />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/segnalatori/new" element={
            <ProtectedRoute>
              <MainLayout>
                <SegnalatoreForm />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* TODO: Add these when you create the components */}
          {/*
          <Route path="/segnalatori/edit/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <EditSegnalatoreForm />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/segnalatori/:id" element={
            <ProtectedRoute>
              <MainLayout>
                <SegnalatoreDetail />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/segnalatori/upload" element={
            <ProtectedRoute>
              <MainLayout>
                <UploadSegnalatori />
              </MainLayout>
            </ProtectedRoute>
          } />
          */}
           <Route path="/procacciatori" element={
            <ProtectedRoute>
              <MainLayout>
                <ProcacciatoriList />
              </MainLayout>
            </ProtectedRoute>
          } />

          <Route path="/procacciatori/new" element={
            <ProtectedRoute>
              <MainLayout>
                <ProcacciatoreForm />
              </MainLayout>
            </ProtectedRoute>
          } />

          {/* Profile routes */}
          <Route path="/profile" element={
            <ProtectedRoute>
              <MainLayout>
                <UserProfile />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/change-password" element={
            <ProtectedRoute>
              <MainLayout>
                <ChangePasswordPage />
              </MainLayout>
            </ProtectedRoute>
          } />
          
          <Route path="/approvals" element={ <ProtectedRoute>
              <MainLayout>
                <ApprovalsPage />
              </MainLayout>
            </ProtectedRoute>} />
          
          {/* Default and 404 routes */}
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;