
// src/lib/auth.ts
import { rolePermissionMap } from './users';
import type { User, UserRole } from './users';
import { addActivityLog, clearActivityLog } from './activityLog';

const USER_ROLE_KEY = 'currentUserRole';
const USER_ID_KEY = 'currentUserId';
const USER_NAME_KEY = 'currentUserName';

export async function loginUser(username: string, password: string): Promise<{ success: boolean; message?: string; user?: User }> {
  console.log(`Attempting to log in user: ${username}`);
  
  try {
    const response = await fetch('https://harisindustries.com.ng/busa-api/database/login.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });

    // The backend now provides specific error messages for different scenarios.
    const result = await response.json();
    
    if (!response.ok) {
        // We will prioritize the message from the backend JSON response
        throw new Error(result.message || `Server responded with status: ${response.status}`);
    }

    if (result.success && result.user) {
        if (typeof window !== 'undefined') {
            localStorage.setItem(USER_ROLE_KEY, result.user.role);
            localStorage.setItem(USER_ID_KEY, result.user.id);
            localStorage.setItem(USER_NAME_KEY, result.user.name);
        }
        console.log(`Login successful for user: ${result.user.name}, Role: ${result.user.role}`);
        addActivityLog('User logged in successfully.');
        const { password, ...userWithoutPassword } = result.user;
        return { success: true, user: userWithoutPassword };
    } else {
        // This case handles success:false from the backend, which now has a specific message.
        console.log(`Login failed from backend: ${result.message}`);
        return { success: false, message: result.message || 'Invalid credentials from server.' };
    }

  } catch (error: any) {
    console.error("Error during login API call:", error);
    // This will catch network errors or if the server is completely down.
    if (error.name === 'TypeError') { // Often indicates a network error (e.g., CORS, DNS, offline)
        return { success: false, message: 'Cannot connect to the login service. Please check your network connection and try again.' };
    }
    return { success: false, message: error.message || 'An unexpected error occurred during login.' };
  }
}


export function logoutUser(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(USER_ROLE_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(USER_NAME_KEY);
    // Optionally clear the activity log on logout
    // clearActivityLog(); 
  }
}

export function isAuthenticated(): boolean {
  if (typeof window !== 'undefined') {
    return !!localStorage.getItem(USER_ROLE_KEY);
  }
  return false;
}

export function getCurrentUserRole(): UserRole | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_ROLE_KEY) as UserRole | null;
  }
  return null;
}


export function getCurrentUserPermissionRoles(): UserRole[] {
    const primaryRole = getCurrentUserRole();
    if (!primaryRole) return [];
    return rolePermissionMap[primaryRole as keyof typeof rolePermissionMap] || [primaryRole];
}


export function getCurrentUserId(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_ID_KEY);
  }
  return null;
}

export function getCurrentUserName(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USER_NAME_KEY);
  }
  return null;
}

    