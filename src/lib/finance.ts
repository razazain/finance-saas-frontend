import type { Account, AppData } from '@/types';

/**
 * Accounts usable for posted transactions in the current backend contract.
 * The transaction service currently requires an account currency to equal the
 * business currency. Keep that constraint visible in the UI until the backend
 * supports true multi-currency posting and revaluation.
 */
export function getPostableAccounts(data: Pick<AppData, 'accounts' | 'settings'>): Account[] {
  return data.accounts.filter(
    (account) => account.status === 'Active' && !account.isSystem && account.currency === data.settings.currency,
  );
}
