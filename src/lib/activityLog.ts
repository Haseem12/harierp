
import { getCurrentUserName } from './auth';

const ACTIVITY_LOG_KEY = 'userActivityLog';
const MAX_LOG_ENTRIES = 200; // Limit the number of log entries to prevent excessive storage use

export interface UserActivityLogEntry {
  timestamp: string;
  userName: string;
  message: string;
  details?: object;
}

/**
 * Retrieves the user activity log from localStorage.
 * @returns An array of log entries.
 */
export function getUserActivityLog(): UserActivityLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const log = localStorage.getItem(ACTIVITY_LOG_KEY);
    return log ? JSON.parse(log) : [];
  } catch (error) {
    console.error("Error retrieving activity log:", error);
    return [];
  }
}

/**
 * Adds a new entry to the user activity log in localStorage.
 * @param message The log message describing the action.
 * @param details Optional object with additional context.
 */
export function addActivityLog(message: string, details?: object) {
  if (typeof window === 'undefined') return;

  const userName = getCurrentUserName() || 'System';
  
  const newEntry: UserActivityLogEntry = {
    timestamp: new Date().toISOString(),
    userName,
    message,
    details,
  };

  try {
    const currentLog = getUserActivityLog();
    // Add new entry and slice to maintain the max number of entries
    const updatedLog = [newEntry, ...currentLog].slice(0, MAX_LOG_ENTRIES);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(updatedLog));
  } catch (error) {
    console.error("Error saving to activity log:", error);
  }
}

/**
 * Clears the entire user activity log from localStorage.
 */
export function clearActivityLog() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVITY_LOG_KEY);
}
