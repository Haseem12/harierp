
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';

/**
 * Custom hook to handle user inactivity timeout.
 * @param onTimeout Callback function to execute when the user is inactive.
 * @param timeoutDuration The duration of inactivity in milliseconds before timeout.
 */
export function useInactivityTimeout(onTimeout: () => void, timeoutDuration: number = 300000) { // Default 5 minutes
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(onTimeout, timeoutDuration);
  }, [onTimeout, timeoutDuration]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimeout();
    };

    // Set the initial timeout
    resetTimeout();

    // Add event listeners for user activity
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup function to remove event listeners and clear timeout
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [resetTimeout]);
}
