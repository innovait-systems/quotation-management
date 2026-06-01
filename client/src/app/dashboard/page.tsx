'use client';

import React from 'react';
import { useDashboardStore } from '../../store/dashboardStore';

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

/**
 * Dashboard Router
 * 
 * Slim hub that delegates rendering to dedicated view components
 * based on the active tab from the Zustand dashboard store.
 */
export default function DashboardPage() {
  const { currentTab } = useDashboardStore();

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
  };

  return views[currentTab] || <DashboardHubView />;
}
