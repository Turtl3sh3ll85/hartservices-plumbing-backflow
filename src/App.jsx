import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
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
import RoleGuard from '@/components/RoleGuard';

// Add page imports here (lazy-loaded for code splitting)
const RoleHome = lazy(() => import('@/components/RoleHome'));
const Customers = lazy(() => import('@/pages/Customers'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const InvoiceEditor = lazy(() => import('@/pages/InvoiceEditor'));
const Estimates = lazy(() => import('@/pages/Estimates'));
const Settings = lazy(() => import('@/pages/Settings'));
const Users = lazy(() => import('@/pages/Users'));
const UserDetail = lazy(() => import('@/pages/UserDetail'));
const DriveFileMonitor = lazy(() => import('@/pages/DriveFileMonitor'));
const Expenses = lazy(() => import('@/pages/Expenses'));
const PayInvoice = lazy(() => import('@/pages/PayInvoice'));
const AcceptEstimate = lazy(() => import('@/pages/AcceptEstimate'));
const MyDocuments = lazy(() => import('@/pages/MyDocuments'));

const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);

const pageVariants = {
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  slide: { initial: { x: 24, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: -24, opacity: 0 } },
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);
  const isPush = location.pathname.startsWith(prevPathRef.current + "/") && location.pathname.length > prevPathRef.current.length;
  const animType = isPush ? "slide" : "fade";
  useEffect(() => { prevPathRef.current = location.pathname; }, [location.pathname]);

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
    <Suspense fallback={<LoadingSpinner />}>
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          initial={pageVariants[animType].initial}
          animate={pageVariants[animType].animate}
          exit={pageVariants[animType].exit}
          transition={{ duration: 0.2 }}
        >
        <Routes location={location}>
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
              <Route path="/invoices" element={<RoleGuard roles={["admin", "tech", "accountant"]}><Invoices /></RoleGuard>} />
              <Route path="/invoices/new" element={<RoleGuard roles={["admin", "tech", "accountant"]}><InvoiceEditor /></RoleGuard>} />
              <Route path="/invoices/:id" element={<RoleGuard roles={["admin", "tech", "accountant"]}><InvoiceEditor /></RoleGuard>} />
              <Route path="/expenses" element={<RoleGuard roles={["admin", "accountant"]}><Expenses /></RoleGuard>} />
              <Route path="/estimates" element={<RoleGuard roles={["admin", "tech", "accountant"]}><Estimates /></RoleGuard>} />
              <Route path="/estimates/new" element={<RoleGuard roles={["admin", "tech", "accountant"]}><InvoiceEditor /></RoleGuard>} />
              <Route path="/estimates/:id" element={<RoleGuard roles={["admin", "tech", "accountant"]}><InvoiceEditor /></RoleGuard>} />
              <Route path="/customers" element={<RoleGuard roles={["admin"]}><Customers /></RoleGuard>} />
              <Route path="/settings" element={<RoleGuard roles={["admin"]}><Settings /></RoleGuard>} />
              <Route path="/users" element={<RoleGuard roles={["admin"]}><Users /></RoleGuard>} />
              <Route path="/users/:id" element={<RoleGuard roles={["admin"]}><UserDetail /></RoleGuard>} />
              <Route path="/drive-inbox" element={<RoleGuard roles={["admin"]}><DriveFileMonitor /></RoleGuard>} />
            </Route>
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
        </motion.div>
      </AnimatePresence>
    </Suspense>
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