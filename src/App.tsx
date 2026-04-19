import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { FullBleedLayout } from "@/components/layout/FullBleedLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import LoginPage from "./pages/Login";
import DashboardPage from "./pages/Dashboard";
import ProductsPage from "./pages/Products";
import OrdersPage from "./pages/Orders";
import NewOrderPage from "./pages/NewOrder";
import PaymentsPage from "./pages/Payments";
import DeliveryPage from "./pages/Delivery";
import CompletedPage from "./pages/Completed";
import InventoryPage from "./pages/Inventory";
import ClientsPage from "./pages/Clients";
import ClientProfilePage from "./pages/ClientProfile";
import RenewalsPage from "./pages/Renewals";
import RemindersPage from "./pages/Reminders";
import FeedbackPage from "./pages/Feedback";
import OldClientsPage from "./pages/OldClients";
import AnalyticsPage from "./pages/Analytics";
import SettingsPage from "./pages/Settings";
import StaffPage from "./pages/Staff";
import RolesPage from "./pages/Roles";
import TemplatesPage from "./pages/Templates";
import AuditLogsPage from "./pages/AuditLogs";
import WhatsAppPage from "./pages/WhatsApp";
import ConversationsPage from "./pages/Conversations";
import LeadsPage from "./pages/Leads";
import SupportPage from "./pages/Support";
import FulfillmentPage from "./pages/Fulfillment";
import ProvisioningPage from "./pages/Provisioning";
import ResearchPage from "./pages/Research";
import VendorsPage from "./pages/Vendors";
import TasksPage from "./pages/Tasks";
import ReportsPage from "./pages/Reports";
import TeamManagementPage from "./pages/TeamManagement";
import ChannelIntegrationsPage from "./pages/ChannelIntegrations";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/new" element={<NewOrderPage />} />
              <Route path="/payments" element={<PaymentsPage />} />
              <Route path="/fulfillment" element={<FulfillmentPage />} />
              <Route path="/delivery" element={<DeliveryPage />} />
              <Route path="/completed" element={<CompletedPage />} />
              <Route path="/provisioning" element={<ProvisioningPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientProfilePage />} />
              <Route path="/renewals" element={<RenewalsPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/old-clients" element={<OldClientsPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/vendors" element={<VendorsPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/team" element={<TeamManagementPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/staff" element={<StaffPage />} />
              <Route path="/settings/roles" element={<RolesPage />} />
              <Route path="/settings/templates" element={<TemplatesPage />} />
              <Route path="/settings/audit" element={<AuditLogsPage />} />
              <Route path="/admin/channels" element={<ChannelIntegrationsPage />} />
            </Route>
            <Route element={<ProtectedRoute><FullBleedLayout /></ProtectedRoute>}>
              <Route path="/conversations" element={<ConversationsPage />} />
            </Route>
            <Route path="/whatsapp" element={<ProtectedRoute><WhatsAppPage /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
