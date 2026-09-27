import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Customers from '@/pages/Customers';
import Jobs from '@/pages/Jobs';
import JobDetail from '@/pages/JobDetail';
import Invoices from '@/pages/Invoices';
import InvoiceEditor from '@/pages/InvoiceEditor';
import Estimates from '@/pages/Estimates';
import Settings from '@/pages/Settings';
import PayInvoice from '@/pages/PayInvoice';
import AcceptEstimate from '@/pages/AcceptEstimate';
import MyDocuments from '@/pages/MyDocuments';
import RoleGuard from '@/components/RoleGuard';
import RoleHome from '@/components/RoleHome';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/pay/:invoiceId" element={<PayInvoice />} />
      <Route path="/accept/:estimateId" element={<AcceptEstimate />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<RoleHome />} />
          <Route path="/portal" element={<RoleGuard roles={["customer"]}><MyDocuments /></RoleGuard>} />
          <Route path="/jobs" element={<RoleGuard roles={["admin", "tech"]}><Jobs /></RoleGuard>} />
          <Route path="/jobs/:id" element={<RoleGuard roles={["admin", "tech"]}><JobDetail /></RoleGuard>} />
          <Route path="/invoices" element={<RoleGuard roles={["admin", "tech"]}><Invoices /></RoleGuard>} />
          <Route path="/invoices/new" element={<RoleGuard roles={["admin", "tech"]}><InvoiceEditor /></RoleGuard>} />
          <Route path="/invoices/:id" element={<RoleGuard roles={["admin", "tech"]}><InvoiceEditor /></RoleGuard>} />
          <Route path="/estimates" element={<RoleGuard roles={["admin", "tech"]}><Estimates /></RoleGuard>} />
          <Route path="/estimates/new" element={<RoleGuard roles={["admin", "tech"]}><InvoiceEditor /></RoleGuard>} />
          <Route path="/estimates/:id" element={<RoleGuard roles={["admin", "tech"]}><InvoiceEditor /></RoleGuard>} />
          <Route path="/customers" element={<RoleGuard roles={["admin"]}><Customers /></RoleGuard>} />
          <Route path="/settings" element={<RoleGuard roles={["admin"]}><Settings /></RoleGuard>} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App