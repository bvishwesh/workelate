import { useEffect, useRef, useState, useCallback } from 'react';
import { TimelineEvent, TaskExecution } from '../types';

interface UseSSEOptions {
  onComplete?: (finalExecution?: TaskExecution) => void;
  onError?: (error: any) => void;
}

export function useSSE(executionId: string | null, options: UseSSEOptions = {}) {
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [stdoutLogs, setStdoutLogs] = useState<string[]>([]);
  const [stderrLogs, setStderrLogs] = useState<string[]>([]);
  const [executionStatus, setExecutionStatus] = useState<string>('Pending');
  const [isStreaming, setIsStreaming] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const optionsRef = useRef<UseSSEOptions>(options);
  optionsRef.current = options;

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setTimelineEvents([]);
    setStdoutLogs([]);
    setStderrLogs([]);
    setExecutionStatus('Pending');
    setIsStreaming(false);
    setErrorDetails(null);
  }, []);

  useEffect(() => {
    if (!executionId) {
      reset();
      return;
    }

    reset();
    setIsStreaming(true);
    setExecutionStatus('Running');

    const sseUrl = `/api/executions/${executionId}/stream`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setExecutionStatus('Running');
    });

    es.addEventListener('timeline_step', (e) => {
      try {
        const data: TimelineEvent = JSON.parse(e.data);
        setTimelineEvents((prev) => {
          // Replace step if exists or append
          const existingIdx = prev.findIndex(
            (p) => p.step_index === data.step_index && p.step_index !== undefined
          );
          if (existingIdx !== -1) {
            const next = [...prev];
            next[existingIdx] = data;
            return next;
          }
          return [...prev, data];
        });
      } catch (err) {
        console.error('Error parsing timeline_step SSE data', err);
      }
    });

    es.addEventListener('stdout', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.message) {
          setStdoutLogs((prev) => [...prev, data.message]);
        }
      } catch (err) {
        console.error('Error parsing stdout SSE data', err);
      }
    });

    es.addEventListener('stderr', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.message) {
          setStderrLogs((prev) => [...prev, data.message]);
        }
      } catch (err) {
        console.error('Error parsing stderr SSE data', err);
      }
    });

    es.addEventListener('complete', (e) => {
      try {
        const data = JSON.parse(e.data);
        const status = data.details?.status || data.status || 'Completed';
        setExecutionStatus(status);
        setIsStreaming(false);
        if (data.details?.error_message) {
          setErrorDetails(data.details.error_message);
        }
        es.close();
        eventSourceRef.current = null;
        if (optionsRef.current.onComplete) {
          optionsRef.current.onComplete();
        }
      } catch (err) {
        console.error('Error parsing complete SSE data', err);
        setIsStreaming(false);
        es.close();
        eventSourceRef.current = null;
      }
    });

    es.onerror = (err) => {
      console.warn('SSE stream closed or encountered error', err);
      setIsStreaming(false);
      es.close();
      eventSourceRef.current = null;
      if (optionsRef.current.onError) {
        optionsRef.current.onError(err);
      }
    };

    // Safety fallback timer: auto-clear streaming state if still running after 70 seconds
    const safetyTimer = setTimeout(() => {
      setIsStreaming(false);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    }, 70000);

    return () => {
      clearTimeout(safetyTimer);
      es.close();
      eventSourceRef.current = null;
    };
  }, [executionId]);

  const stop = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return {
    timelineEvents,
    stdoutLogs,
    stderrLogs,
    executionStatus,
    isStreaming,
    errorDetails,
    reset,
    stop
  };
}
