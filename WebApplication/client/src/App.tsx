import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { WidgetLayout } from './components/widgets/WidgetLayout';
import { LocaleProvider } from './i18n/LocaleContext';
import { AdminAuthProvider } from './pages/AdminDashboard/AdminAuthContext';
import { AdminLayout } from './pages/AdminDashboard/AdminLayout';
import { CategoriesManager } from './pages/AdminDashboard/CMS/CategoriesManager';
import { ConversionHistory } from './pages/AdminDashboard/Logs/ConversionHistory';
import { SystemErrors } from './pages/AdminDashboard/Logs/SystemErrors';
import { AdMonetizationManager } from './pages/AdminDashboard/Monetization/AdMonetizationManager';
import { SystemOverview } from './pages/AdminDashboard/Overview/SystemOverview';
import { RequireAdmin } from './pages/AdminDashboard/RequireAdmin';
import { AdminAccess } from './pages/AdminDashboard/Security/AdminAccess';
import { GlobalNotice } from './pages/AdminDashboard/Settings/GlobalNotice';
import { HeaderFooterManager } from './pages/AdminDashboard/Settings/HeaderFooterManager';
import { LimitsConfig } from './pages/AdminDashboard/Settings/LimitsConfig';
import { WidgetCustomizer } from './pages/AdminDashboard/Settings/WidgetCustomizer';
import { MasterToolsManager } from './pages/AdminDashboard/Tools/MasterToolsManager';
import { TimeRangeStats } from './pages/AdminDashboard/Userinfo/TimeRangeStats';
import { UserOnlineNow } from './pages/AdminDashboard/Userinfo/UserOnlineNow';
import { UserRoleManager } from './pages/AdminDashboard/Users/UserRoleManager';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { RequireUser } from './pages/Auth/RequireUser';
import { ResetPasswordPage } from './pages/Auth/ResetPasswordPage';
import { UserDashboard } from './pages/Dashboard/UserDashboard';
import { Home } from './pages/Home';
import {
  CategoryPage,
  SubcategoryPage,
  ToolPage,
  ToolsIndexPage,
  ToolsLayout,
} from './pages/Tools/ToolsExplorer';

// Lazy Loaded Tool Suites for Performance Optimization
const DocumentImageExplorer = lazy(() =>
  import('./components/tools/DocumentImage/DocumentImageExplorer').then((m) => ({
    default: m.DocumentImageExplorer,
  })),
);
const DocumentImageToolView = lazy(() =>
  import('./components/tools/DocumentImage/DocumentImageToolView').then((m) => ({
    default: m.DocumentImageToolView,
  })),
);
const MediaExplorer = lazy(() =>
  import('./components/tools/Media/MediaExplorer').then((m) => ({ default: m.MediaExplorer })),
);
const MediaToolView = lazy(() =>
  import('./components/tools/Media/MediaToolView').then((m) => ({ default: m.MediaToolView })),
);
const DeveloperExplorer = lazy(() =>
  import('./components/tools/Developer/DeveloperExplorer').then((m) => ({
    default: m.DeveloperExplorer,
  })),
);
const DeveloperToolView = lazy(() =>
  import('./components/tools/Developer/DeveloperToolView').then((m) => ({
    default: m.DeveloperToolView,
  })),
);
const SecurityNetworkExplorer = lazy(() =>
  import('./components/tools/SecurityNetwork/SecurityNetworkExplorer').then((m) => ({
    default: m.SecurityNetworkExplorer,
  })),
);
const SecurityNetworkToolView = lazy(() =>
  import('./components/tools/SecurityNetwork/SecurityNetworkToolView').then((m) => ({
    default: m.SecurityNetworkToolView,
  })),
);
const TextCalcExplorer = lazy(() =>
  import('./components/tools/TextCalc/TextCalcExplorer').then((m) => ({
    default: m.TextCalcExplorer,
  })),
);
const TextCalcToolView = lazy(() =>
  import('./components/tools/TextCalc/TextCalcToolView').then((m) => ({
    default: m.TextCalcToolView,
  })),
);
const SeoWebmasterExplorer = lazy(() =>
  import('./components/tools/SeoWebmaster/SeoWebmasterExplorer').then((m) => ({
    default: m.SeoWebmasterExplorer,
  })),
);
const SeoWebmasterToolView = lazy(() =>
  import('./components/tools/SeoWebmaster/SeoWebmasterToolView').then((m) => ({
    default: m.SeoWebmasterToolView,
  })),
);
const DesignExplorer = lazy(() =>
  import('./components/tools/Design/DesignExplorer').then((m) => ({ default: m.DesignExplorer })),
);
const DesignToolView = lazy(() =>
  import('./components/tools/Design/DesignToolView').then((m) => ({ default: m.DesignToolView })),
);
const ProductivityExplorer = lazy(() =>
  import('./components/tools/Productivity/ProductivityExplorer').then((m) => ({
    default: m.ProductivityExplorer,
  })),
);
const ProductivityToolView = lazy(() =>
  import('./components/tools/Productivity/ProductivityToolView').then((m) => ({
    default: m.ProductivityToolView,
  })),
);
const ScienceMathExplorer = lazy(() =>
  import('./components/tools/ScienceMath/ScienceMathExplorer').then((m) => ({
    default: m.ScienceMathExplorer,
  })),
);
const ScienceMathToolView = lazy(() =>
  import('./components/tools/ScienceMath/ScienceMathToolView').then((m) => ({
    default: m.ScienceMathToolView,
  })),
);

/** Fast visual fallback for lazy modules */
function ToolLoadingFallback() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-white/5" />
      <div className="h-40 rounded-3xl bg-white/[0.03]" />
      <div className="grid gap-6 md:grid-cols-2">
        <div className="h-72 rounded-3xl bg-white/[0.02]" />
        <div className="h-72 rounded-3xl bg-white/[0.02]" />
      </div>
    </div>
  );
}

/** The public homepage shell */
function PublicHome() {
  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950">
      <Header />
      <Home />
      <Footer />
    </div>
  );
}

/** Dedicated transcriber view */
function TranscriberView() {
  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950">
      <Header />
      <WidgetLayout />
      <Footer />
    </div>
  );
}

/**
 * Public chrome for pages other than the homepage.
 */
function PublicShell() {
  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950">
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
          {/* Main Professional Homepage */}
          <Route
            path="/"
            element={
              <LocaleProvider>
                <PublicHome />
              </LocaleProvider>
            }
          />

          {/* Dedicated Instant Transcriber page */}
          <Route
            path="/transcribe"
            element={
              <LocaleProvider>
                <TranscriberView />
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
            {/* Direct SEO-Friendly Module & Tool Routes with Suspense */}
            <Route
              path="/tools/document-pdf"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DocumentImageExplorer moduleSlug="document-pdf" />
                </Suspense>
              }
            />
            <Route
              path="/tools/document-pdf/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DocumentImageToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/image-graphics"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DocumentImageExplorer moduleSlug="image-graphics" />
                </Suspense>
              }
            />
            <Route
              path="/tools/image-graphics/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DocumentImageToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/audio-video"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <MediaExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/audio-video/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <MediaToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/developer-code"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DeveloperExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/developer-code/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DeveloperToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/security-network"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <SecurityNetworkExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/security-network/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <SecurityNetworkToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/text-calculators"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <TextCalcExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/text-calculators/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <TextCalcToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/seo-webmaster"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <SeoWebmasterExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/seo-webmaster/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <SeoWebmasterToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/color-design"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DesignExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/color-design/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <DesignToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/ai-productivity"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <ProductivityExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/ai-productivity/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <ProductivityToolView />
                </Suspense>
              }
            />
            <Route
              path="/tools/math-science"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <ScienceMathExplorer />
                </Suspense>
              }
            />
            <Route
              path="/tools/math-science/:toolSlug"
              element={
                <Suspense fallback={<ToolLoadingFallback />}>
                  <ScienceMathToolView />
                </Suspense>
              }
            />

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

          {/* Super Admin area */}
          <Route
            path="/AdminDashboard"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="Overview" replace />} />
            <Route path="Overview" element={<SystemOverview />} />
            <Route path="Tools/MasterManager" element={<MasterToolsManager />} />
            <Route path="Monetization/AdManager" element={<AdMonetizationManager />} />
            <Route path="Users/RoleManager" element={<UserRoleManager />} />
            <Route path="CMS/Categories" element={<CategoriesManager />} />
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

          {/* Aliases for Admin navigation */}
          <Route path="/admin" element={<Navigate to="/AdminDashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={<Navigate to="/AdminDashboard/Overview" replace />}
          />

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
