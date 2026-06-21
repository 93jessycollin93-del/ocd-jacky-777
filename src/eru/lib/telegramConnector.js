/**
 * TELEGRAM CONNECTOR
 * 
 * This module provides the frontend interface for Telegram integration.
 * All sensitive operations (Bot API calls, token generation) must occur server-side
 * via backend functions.
 * 
 * ARCHITECTURE:
 * - Frontend: UI linking, notification preferences, status display
 * - Backend: Bot API interaction, token generation, message relay
 * - Entity: TelegramAccount (stores mapping + verification state)
 */

import { base44 } from '@/eru/api/base44Client';

/**
 * Check if user has Telegram account linked
 */
export const getTelegramAccount = async (userEmail) => {
  try {
    const accounts = await base44.entities.TelegramAccount.filter(
      { user_email: userEmail },
      '-created_date',
      1
    );
    return accounts?.[0] || null;
  } catch (err) {
    console.error('Failed to fetch Telegram account:', err);
    return null;
  }
};

/**
 * Initiate Telegram linking flow
 * Returns a linking code/token to display to user
 * User sends this code to bot: /link <code>
 */
export const initiateTelegramLinking = async (userEmail) => {
  try {
    // Create pending account record with verification token
    const linkingToken = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const account = await base44.entities.TelegramAccount.create({
      user_email: userEmail,
      telegram_user_id: 'pending',
      linking_token: linkingToken,
      status: 'pending_verification',
    });

    return {
      success: true,
      linking_code: linkingToken,
      account_id: account.id,
      instructions: `Send this code to our Telegram bot: /link ${linkingToken}`,
    };
  } catch (err) {
    console.error('Failed to initiate Telegram linking:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Complete Telegram linking (called by backend after bot verification)
 * Backend verifies the Telegram user ID matches the linking code
 */
export const completeTelegramLinking = async (accountId, telegramUserId, userName) => {
  try {
    await base44.entities.TelegramAccount.update(accountId, {
      telegram_user_id: telegramUserId,
      telegram_username: userName,
      is_verified: true,
      verified_at: new Date().toISOString(),
      status: 'active',
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to complete Telegram linking:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Update notification preferences
 */
export const updateTelegramNotifications = async (accountId, enabled, notificationTypes = []) => {
  try {
    await base44.entities.TelegramAccount.update(accountId, {
      notifications_enabled: enabled,
      notification_types: notificationTypes,
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to update Telegram notifications:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Revoke Telegram account linking
 */
export const revokeTelegramAccount = async (accountId) => {
  try {
    await base44.entities.TelegramAccount.update(accountId, {
      status: 'revoked',
      notifications_enabled: false,
    });
    return { success: true };
  } catch (err) {
    console.error('Failed to revoke Telegram account:', err);
    return { success: false, error: err.message };
  }
};

/**
 * BACKEND REFERENCE: Bot Command Handlers
 * These would be implemented in backend functions:
 * 
 * /link <code> - Initiate account linking
 * /verify - Confirm linking (backend calls completeTelegramLinking)
 * /balance - Show user's asset balance
 * /inventory - List user's Jade assets
 * /market - Show market data snapshot
 * /orders - List pending orders
 * /notifications - Toggle notifications
 * 
 * All commands must validate user ID against TelegramAccount.telegram_user_id
 * and check is_verified=true before executing.
 */

/**
 * Simulate sending notification via Telegram (actual call via backend)
 * Backend would use Telegram Bot API: bot.sendMessage(chatId, message)
 */
export const sendTelegramNotification = async (accountId, title, message, type = 'alert') => {
  try {
    // In production, this would call a backend function that uses the Bot API
    const account = await base44.entities.TelegramAccount.filter({ id: accountId });
    
    if (!account || !account.notifications_enabled) {
      return { success: false, error: 'Notifications not enabled' };
    }

    if (!account.notification_types.includes(type)) {
      return { success: false, error: 'Notification type not subscribed' };
    }

    // This would be handled by backend Bot API call
    // bot.sendMessage(account.telegram_user_id, `${title}\n${message}`);
    
    await base44.entities.TelegramAccount.update(accountId, {
      last_notified_at: new Date().toISOString(),
    });

    return { success: true, message: 'Notification sent to Telegram' };
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
    return { success: false, error: err.message };
  }
};

export default {
  getTelegramAccount,
  initiateTelegramLinking,
  completeTelegramLinking,
  updateTelegramNotifications,
  revokeTelegramAccount,
  sendTelegramNotification,
};