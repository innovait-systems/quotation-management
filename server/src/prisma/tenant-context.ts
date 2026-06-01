import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContextPayload {
  tenantId: string;
  slug: string;
  plan: string;
}

export const tenantContextStorage = new AsyncLocalStorage<TenantContextPayload>();
