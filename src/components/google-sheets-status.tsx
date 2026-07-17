"use client";

import { useCallback, useEffect, useState } from "react";

type ConnectionStatus =
  | { state: "loading" }
  | { state: "connected"; employeeCount: number }
  | { state: "error"; message: string };

export function GoogleSheetsStatus() {
  const [status, setStatus] = useState<ConnectionStatus>({ state: "loading" });

  const fetchConnection = useCallback(async (): Promise<ConnectionStatus> => {
    try {
      const response = await fetch("/api/google-sheets/status", { cache: "no-store" });
      const result = (await response.json()) as {
        connected?: boolean;
        employeeCount?: number;
        message?: string;
      };

      if (!response.ok || !result.connected) {
        throw new Error(result.message || "Unable to connect to Google Sheets.");
      }

      return { state: "connected", employeeCount: result.employeeCount ?? 0 };
    } catch (error) {
      return {
        state: "error",
        message: error instanceof Error ? error.message : "Unable to connect to Google Sheets.",
      };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void fetchConnection().then((result) => {
      if (!cancelled) setStatus(result);
    });

    return () => {
      cancelled = true;
    };
  }, [fetchConnection]);

  const checkConnection = async () => {
    setStatus({ state: "loading" });
    setStatus(await fetchConnection());
  };

  if (status.state === "loading") {
    return <span className="text-xs text-gray-500">Checking employee sheet…</span>;
  }

  if (status.state === "connected") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500" />
        Google Sheet connected · {status.employeeCount} employees
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={checkConnection}
      title={status.message}
      className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
    >
      <span className="h-2 w-2 rounded-full bg-red-500" />
      Sheet connection failed · Retry
    </button>
  );
}
