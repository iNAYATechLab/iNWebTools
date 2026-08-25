import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { LocaleProvider } from './i18n/LocaleContext';
import { AdminAuthProvider } from './pages/AdminDashboard/AdminAuthContext';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
import { UserDashboard } from './pages/Dashboard/UserDashboard';
import { RequireUser } from './pages/Auth/RequireUser';
import { AdminLayout } from './pages/AdminDashboard/AdminLayout';
import { RequireAdmin } from './pages/AdminDashboard/RequireAdmin';
import { ConversionHistory } from './pages/AdminDashboard/Logs/ConversionHistory';
import { SystemErrors } from './pages/AdminDashboard/Logs/SystemErrors';
import { AdminAccess } from './pages/AdminDashboard/Security/AdminAccess';
import { GlobalNotice } from './pages/AdminDashboard/Settings/GlobalNotice';
import { HeaderFooterManager } from './pages/AdminDashboard/Settings/HeaderFooterManager';
import { LimitsConfig } from './pages/AdminDashboard/Settings/LimitsConfig';
import { WidgetCustomizer } from './pages/AdminDashboard/Settings/WidgetCustomizer';
import { TimeRangeStats } from './pages/AdminDashboard/Userinfo/TimeRangeStats';
import { UserOnlineNow } from './pages/AdminDashboard/Userinfo/UserOnlineNow';
import { WidgetLayout } from './components/widgets/WidgetLayout';

/** The public transcription app. */
function PublicApp() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Decorative background — pointer-events-none so it never blocks the UI. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="absolute -bottom-52 right-0 h-[420px] w-[620px] rounded-full bg-accent-500/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <Header />
        <WidgetLayout />
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/*
        AdminAuthProvider wraps everything, not just /AdminDashboard, because
        the public header shows either a profile menu or a sign-in link and
        needs to know which. It costs nothing on the public side: with no
        stored token the provider settles synchronously without a request.
      */}
      <AdminAuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <LocaleProvider>
                <PublicApp />
              </LocaleProvider>
            }
          />

          {/*
            Public authentication. Inside LocaleProvider because these pages
            are user-facing and bilingual, unlike the operator dashboard.
          */}
          <Route
            element={
              <LocaleProvider>
                <Outlet />
              </LocaleProvider>
            }
          >
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Where role 'user' lands after signing in. */}
            <Route
              path="/Dashboard"
              element={
                <RequireUser>
                  <UserDashboard />
                </RequireUser>
              }
            />
          </Route>

          {/*
            The admin area is deliberately outside LocaleProvider: it is an
            operator tool, English-only, and should not inherit the public
            chrome. Paths are PascalCase because the user specified them that
            way — they are browser routes, not server paths.
          */}
          <Route
            path="/AdminDashboard"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="Userinfo/UserOnlineNow" replace />} />
            <Route path="Userinfo/UserOnlineNow" element={<UserOnlineNow />} />
            <Route path="Userinfo/TimeRangeStats" element={<TimeRangeStats />} />
            <Route path="Logs/ConversionHistory" element={<ConversionHistory />} />
            <Route path="Logs/SystemErrors" element={<SystemErrors />} />
            <Route path="Settings/LimitsConfig" element={<LimitsConfig />} />
            <Route path="Settings/GlobalNotice" element={<GlobalNotice />} />
            <Route path="Settings/HeaderFooterManager" element={<HeaderFooterManager />} />
            <Route path="Settings/WidgetCustomizer" element={<WidgetCustomizer />} />
            <Route path="Security/AdminAccess" element={<AdminAccess />} />
          </Route>

          {/* Anything else goes back to the app rather than a blank screen. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
