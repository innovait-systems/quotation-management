'use client';

import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore';
import { useTenantStore } from '../../store/tenantStore';

import DashboardHubView from './views/DashboardHubView';
import QuotationsView from './views/QuotationsView';
import PurchaseOrdersView from './views/PurchaseOrdersView';
import InvoicesView from './views/InvoicesView';
import ServicesView from './views/ServicesView';
import SettingsView from './views/SettingsView';
import SubscriptionsView from './views/SubscriptionsView';
import AICopilotView from './views/AICopilotView';
import ComplianceView from './views/ComplianceView';
import TemplatesView from './views/TemplatesView';
import CustomersView from './views/CustomersView';
import AgreementsView from './views/AgreementsView';
import UsersView from './views/UsersView';
import CompaniesView from './views/CompaniesView';
import SaaSSubscriptionsView from './views/SaaSSubscriptionsView';

/**
 * Dashboard Router
 * 
 * Slim hub that delegates rendering to dedicated view components
 * based on the active tab from the Zustand dashboard store.
 * 
 * In SAAS Admin sessions, only administrative views are accessible;
 * the fallback view is CompaniesView instead of DashboardHubView
 * to prevent operational data (quotations, POs, invoices) from leaking.
 */
export default function DashboardPage() {
  const { currentTab } = useDashboardStore();
  const { isSaaSAdminSession } = useTenantStore();

  const views: Record<string, React.ReactNode> = {
    DASHBOARD: <DashboardHubView />,
    QUOTATIONS: <QuotationsView />,
    PURCHASE_ORDERS: <PurchaseOrdersView />,
    INVOICES: <InvoicesView />,
    SERVICES: <ServicesView />,
    SETTINGS: <SettingsView />,
    SUBSCRIPTIONS: <SubscriptionsView />,
    AI_COPILOT: <AICopilotView />,
    COMPLIANCE: <ComplianceView />,
    TEMPLATES: <TemplatesView />,
    CUSTOMERS: <CustomersView />,
    AGREEMENTS: <AgreementsView />,
    USERS: <UsersView />,
    COMPANIES: <CompaniesView />,
    SAAS_SUBSCRIPTIONS: <SaaSSubscriptionsView />,
  };

  // In SAAS Admin sessions, fallback to CompaniesView to prevent operational data leakage
  const fallbackView = isSaaSAdminSession ? <CompaniesView /> : <DashboardHubView />;

  return views[currentTab] || fallbackView;
}
