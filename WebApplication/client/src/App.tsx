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
import { CategoriesManager } from './pages/AdminDashboard/CMS/CategoriesManager';
import { DocumentImageExplorer } from './components/tools/DocumentImage/DocumentImageExplorer';
import { DocumentImageToolView } from './components/tools/DocumentImage/DocumentImageToolView';
import { MediaExplorer } from './components/tools/Media/MediaExplorer';
import { MediaToolView } from './components/tools/Media/MediaToolView';
import { DeveloperExplorer } from './components/tools/Developer/DeveloperExplorer';
import { DeveloperToolView } from './components/tools/Developer/DeveloperToolView';
import { SecurityNetworkExplorer } from './components/tools/SecurityNetwork/SecurityNetworkExplorer';
import { SecurityNetworkToolView } from './components/tools/SecurityNetwork/SecurityNetworkToolView';
import { TextCalcExplorer } from './components/tools/TextCalc/TextCalcExplorer';
import { TextCalcToolView } from './components/tools/TextCalc/TextCalcToolView';
import {
  CategoryPage,
  SubcategoryPage,
  ToolPage,
  ToolsIndexPage,
  ToolsLayout,
} from './pages/Tools/ToolsExplorer';

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

/**
 * Public chrome for pages other than the homepage.
 */
function PublicShell() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-[120px]" />
        <div className="absolute -bottom-52 right-0 h-[420px] w-[620px] rounded-full bg-accent-500/10 blur-[120px]" />
      </div>

      <div className="relative flex min-h-screen flex-col">
        <Header />
        <Outlet />
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
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

          {/* Tool catalogue & direct module routes */}
          <Route
            element={
              <LocaleProvider>
                <PublicShell />
              </LocaleProvider>
            }
          >
            {/* Direct SEO-Friendly Module & Tool Routes */}
            <Route
              path="/tools/document-pdf"
              element={<DocumentImageExplorer moduleSlug="document-pdf" />}
            />
            <Route path="/tools/document-pdf/:toolSlug" element={<DocumentImageToolView />} />
            <Route
              path="/tools/image-graphics"
              element={<DocumentImageExplorer moduleSlug="image-graphics" />}
            />
            <Route path="/tools/image-graphics/:toolSlug" element={<DocumentImageToolView />} />
            <Route path="/tools/audio-video" element={<MediaExplorer />} />
            <Route path="/tools/audio-video/:toolSlug" element={<MediaToolView />} />
            <Route path="/tools/developer-code" element={<DeveloperExplorer />} />
            <Route path="/tools/developer-code/:toolSlug" element={<DeveloperToolView />} />
            <Route path="/tools/security-network" element={<SecurityNetworkExplorer />} />
            <Route path="/tools/security-network/:toolSlug" element={<SecurityNetworkToolView />} />
            <Route path="/tools/text-calculators" element={<TextCalcExplorer />} />
            <Route path="/tools/text-calculators/:toolSlug" element={<TextCalcToolView />} />

            {/* Hierarchical Category & Subcategory Catalog Routes */}
            <Route path="/tools" element={<ToolsLayout />}>
              <Route index element={<ToolsIndexPage />} />
              <Route path=":categorySlug" element={<CategoryPage />} />
              <Route path=":categorySlug/:subcategorySlug" element={<SubcategoryPage />} />
              <Route path=":categorySlug/:subcategorySlug/:toolSlug" element={<ToolPage />} />
            </Route>
          </Route>

          {/* Public authentication */}
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

          {/* Admin area */}
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
            <Route path="CMS/Categories" element={<CategoriesManager />} />
            <Route path="Security/AdminAccess" element={<AdminAccess />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
