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
 *
 * Same Header/Footer and background treatment as `PublicApp`, but with an
 * `Outlet` in the middle instead of the widget layout — the tool catalogue
 * brings its own sidebar and does not want the homepage's widget zones.
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
            The tool catalogue. Nested exactly as the URL contract specifies:
            /tools → /tools/:category → /tools/:category/:sub → .../:tool.
            Declaring them as nested routes rather than four flat paths is what
            keeps the sidebar mounted across navigation between depths.
          */}
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

            {/* Hierarchical Category & Subcategory Catalog Routes */}
            <Route path="/tools" element={<ToolsLayout />}>
              <Route index element={<ToolsIndexPage />} />
              <Route path=":categorySlug" element={<CategoryPage />} />
              <Route path=":categorySlug/:subcategorySlug" element={<SubcategoryPage />} />
              <Route path=":categorySlug/:subcategorySlug/:toolSlug" element={<ToolPage />} />
            </Route>
          </Route>

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
            <Route path="CMS/Categories" element={<CategoriesManager />} />
            <Route path="Security/AdminAccess" element={<AdminAccess />} />
          </Route>

          {/* Anything else goes back to the app rather than a blank screen. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
