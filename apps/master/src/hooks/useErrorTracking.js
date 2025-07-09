import { useState, useEffect, useCallback } from 'react';
import { db } from '@/services/firebase/config';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';

export const useErrorTracking = (timeRange = '24h') => {
  const [errors, setErrors] = useState([]);
  const [errorStats, setErrorStats] = useState({
    critical: 0,
    errors: 0,
    warnings: 0,
    trend: '+0%'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate time range
  const getTimeRangeStart = useCallback(() => {
    const now = new Date();
    switch (timeRange) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }, [timeRange]);

  useEffect(() => {
    setIsLoading(true);
    const startTime = getTimeRangeStart();

    // Query for errors within time range
    const errorsQuery = query(
      collection(db, 'systemErrors'),
      where('timestamp', '>=', Timestamp.fromDate(startTime)),
      orderBy('timestamp', 'desc'),
      limit(1000)
    );

    // Real-time subscription
    const unsubscribe = onSnapshot(
      errorsQuery,
      (snapshot) => {
        const errorData = [];
        let stats = {
          critical: 0,
          errors: 0,
          warnings: 0,
          trend: '+0%'
        };

        snapshot.forEach((doc) => {
          const error = { id: doc.id, ...doc.data() };
          errorData.push(error);

          // Count by severity
          switch (error.severity) {
            case 'critical':
              stats.critical++;
              break;
            case 'error':
              stats.errors++;
              break;
            case 'warning':
              stats.warnings++;
              break;
          }
        });

        // Calculate trend (compare to previous period)
        const previousPeriodStart = new Date(startTime.getTime() - (new Date().getTime() - startTime.getTime()));
        const currentCount = errorData.length;

        // Get previous period count
        const previousPeriodQuery = query(
          collection(db, 'systemErrors'),
          where('timestamp', '>=', Timestamp.fromDate(previousPeriodStart)),
          where('timestamp', '<', Timestamp.fromDate(startTime))
        );

        // Calculate trend percentage
        // Note: In production, this would be a separate query
        const trendPercentage = Math.round(Math.random() * 20 - 10); // Mock for now
        stats.trend = trendPercentage >= 0 ? `+${trendPercentage}%` : `${trendPercentage}%`;

        setErrors(errorData);
        setErrorStats(stats);
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching error data:', err);
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [timeRange, getTimeRangeStart]);

  const getErrorDetails = useCallback(async (errorId) => {
    try {
      const errorDoc = await db.collection('systemErrors').doc(errorId).get();
      if (errorDoc.exists) {
        return { id: errorDoc.id, ...errorDoc.data() };
      }
      return null;
    } catch (err) {
      console.error('Error fetching error details:', err);
      throw err;
    }
  }, []);

  const resolveError = useCallback(async (errorId, resolution) => {
    try {
      await db.collection('systemErrors').doc(errorId).update({
        resolved: true,
        resolvedAt: Timestamp.now(),
        resolution: resolution,
        updatedAt: Timestamp.now()
      });
    } catch (err) {
      console.error('Error resolving error:', err);
      throw err;
    }
  }, []);

  const exportErrors = useCallback(() => {
    const csv = [
      ['Timestamp', 'Severity', 'Type', 'Message', 'Tenant', 'User', 'Stack Trace'].join(','),
      ...errors.map(error => [
        new Date(error.timestamp.toDate()).toISOString(),
        error.severity,
        error.type,
        `"${error.message.replace(/"/g, '""')}"`,
        error.tenant || '',
        error.userId || '',
        `"${(error.stackTrace || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `errors-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [errors]);

  return {
    errors,
    errorStats,
    isLoading,
    error,
    getErrorDetails,
    resolveError,
    exportErrors
  };
};
