import React, { useEffect, useState } from 'react';
import { formatDistanceToNow, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { de } from 'date-fns/locale';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface TimerProps {
  startTime: Date;
  targetTime?: Date;
  warningThreshold?: number; // in minutes
  criticalThreshold?: number; // in minutes
  className?: string;
  showIcon?: boolean;
  format?: 'elapsed' | 'remaining' | 'countdown';
}

export const Timer: React.FC<TimerProps> = ({
  startTime,
  targetTime,
  warningThreshold = 10,
  criticalThreshold = 15,
  className,
  showIcon = true,
  format = 'elapsed',
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [status, setStatus] = useState<'normal' | 'warning' | 'critical'>('normal');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const elapsedMinutes = differenceInMinutes(currentTime, startTime);
    
    if (elapsedMinutes >= criticalThreshold) {
      setStatus('critical');
    } else if (elapsedMinutes >= warningThreshold) {
      setStatus('warning');
    } else {
      setStatus('normal');
    }
  }, [currentTime, startTime, warningThreshold, criticalThreshold]);

  const getTimeDisplay = () => {
    if (format === 'elapsed') {
      const elapsedMinutes = differenceInMinutes(currentTime, startTime);
      const elapsedSeconds = differenceInSeconds(currentTime, startTime) % 60;
      
      if (elapsedMinutes < 1) {
        return `${elapsedSeconds}s`;
      }
      
      return `${elapsedMinutes}m ${elapsedSeconds}s`;
    }
    
    if (format === 'remaining' && targetTime) {
      const remainingMinutes = differenceInMinutes(targetTime, currentTime);
      const remainingSeconds = differenceInSeconds(targetTime, currentTime) % 60;
      
      if (remainingMinutes < 0) {
        return 'Überfällig';
      }
      
      if (remainingMinutes < 1) {
        return `${remainingSeconds}s`;
      }
      
      return `${remainingMinutes}m ${remainingSeconds}s`;
    }
    
    if (format === 'countdown') {
      return formatDistanceToNow(startTime, { 
        locale: de, 
        addSuffix: true,
        includeSeconds: true 
      });
    }
    
    return '0s';
  };

  const getStatusStyles = () => {
    switch (status) {
      case 'critical':
        return 'text-red-500 bg-red-50 dark:bg-red-950 animate-pulse';
      case 'warning':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950';
      default:
        return 'text-green-500 bg-green-50 dark:bg-green-950';
    }
  };

  const getIcon = () => {
    if (status === 'critical') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all',
        getStatusStyles(),
        className
      )}
    >
      {showIcon && getIcon()}
      <span className="tabular-nums">{getTimeDisplay()}</span>
    </div>
  );
};

// Specialized timer for order preparation
export const OrderTimer: React.FC<{
  orderCreatedAt: Date;
  estimatedTime?: number; // in minutes
  className?: string;
}> = ({ orderCreatedAt, estimatedTime = 15, className }) => {
  const targetTime = estimatedTime 
    ? new Date(orderCreatedAt.getTime() + estimatedTime * 60 * 1000)
    : undefined;

  return (
    <Timer
      startTime={orderCreatedAt}
      targetTime={targetTime}
      warningThreshold={estimatedTime ? estimatedTime * 0.75 : 10}
      criticalThreshold={estimatedTime || 15}
      format="elapsed"
      className={className}
    />
  );
};

// Timer for pickup/delivery times
export const DeliveryTimer: React.FC<{
  targetTime: Date;
  className?: string;
}> = ({ targetTime, className }) => {
  const now = new Date();
  const minutesUntilTarget = differenceInMinutes(targetTime, now);
  
  return (
    <Timer
      startTime={now}
      targetTime={targetTime}
      warningThreshold={5}
      criticalThreshold={0}
      format="remaining"
      className={className}
      showIcon={minutesUntilTarget <= 5}
    />
  );
};

export default Timer;
