// src/lib/settings.ts
import { mockUsers, User } from './users';

const USER_SETTINGS_KEY = 'userActivationSettings';
const MODULE_SETTINGS_KEY = 'moduleVisibilitySettings';

export type ModuleKey = 'Sales' | 'Finance' | 'Production' | 'Store' | 'Inventory' | 'Laboratory' | 'Purchases' | 'Admin';
export const allModules: ModuleKey[] = ['Sales', 'Finance', 'Production', 'Store', 'Inventory', 'Laboratory', 'Purchases', 'Admin'];

type UserSettings = Record<string, boolean>; // { [userId: string]: boolean }
type ModuleSettings = Record<ModuleKey, boolean>;

/**
 * Retrieves all user activation settings from localStorage.
 */
export function getAllUserSettings(): UserSettings {
  if (typeof window === 'undefined') return {};
  try {
    const settings = localStorage.getItem(USER_SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error("Error parsing user settings from localStorage", error);
  }
  
  // Default: All mock users are active
  const defaultSettings: UserSettings = {};
  mockUsers.forEach(user => {
    defaultSettings[user.id] = true;
  });
  return defaultSettings;
}

/**
 * Retrieves all module visibility settings from localStorage.
 */
export function getAllModuleSettings(): ModuleSettings {
  if (typeof window === 'undefined') {
    return allModules.reduce((acc, module) => ({ ...acc, [module]: true }), {} as ModuleSettings);
  }
  try {
    const settings = localStorage.getItem(MODULE_SETTINGS_KEY);
    if (settings) {
      return JSON.parse(settings);
    }
  } catch (error) {
    console.error("Error parsing module settings from localStorage", error);
  }

  // Default: All modules are visible
  const defaultSettings: ModuleSettings = {} as ModuleSettings;
  allModules.forEach(module => {
    defaultSettings[module] = true;
  });
  return defaultSettings;
}

/**
 * Checks if a specific user is active.
 * @param userId The ID of the user to check.
 * @returns boolean - true if active, false if inactive.
 */
export function getUserActivationStatus(userId: string): boolean {
  const settings = getAllUserSettings();
  return settings[userId] ?? true; // Default to true (active) if not set
}

/**
 * Checks if a specific module is visible.
 * @param moduleKey The key of the module to check.
 * @returns boolean - true if visible, false if hidden.
 */
export function getModuleVisibility(moduleKey: ModuleKey): boolean {
  const settings = getAllModuleSettings();
  return settings[moduleKey] ?? true; // Default to true (visible) if not set
}

/**
 * Saves all user and module settings to localStorage.
 * @param users An array of user objects with their `isActive` status.
 * @param modules A record of module keys and their visibility status.
 */
export function saveAllSettings(users: (User & { isActive: boolean })[], modules: ModuleSettings): void {
  if (typeof window === 'undefined') return;

  const userSettings: UserSettings = {};
  users.forEach(user => {
    userSettings[user.id] = user.isActive;
  });

  localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(userSettings));
  localStorage.setItem(MODULE_SETTINGS_KEY, JSON.stringify(modules));
}
