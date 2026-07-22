"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type {
  TSheetRow,
  PayrollUploadRow,
  DepartmentGroup,
  PayrollEmployeeConfig,
  PayrollConfigurationIssue,
} from "./types";
import {
  toPayrollUpload,
  toMasterSummary,
  totalUnpaidHours,
  roundCurrency,
} from "./transform";

interface PayrollState {
  tsheetRows: TSheetRow[];
  payrollUploadRows: PayrollUploadRow[];
  masterSummaryGroups: DepartmentGroup[];
  bonuses: Record<string, number>;
  commissions: Record<string, number>;
  salaryUnpaidHours: Record<string, number>;
  employeeConfigs: Record<string, PayrollEmployeeConfig>;
  configurationIssues: PayrollConfigurationIssue[];
  payrollDate: string;
  currentStep: number;
  exportedPayrollUpload: boolean;
  exportedMasterSummary: boolean;
  payrollRunSaved: boolean;
  payrollRunId: string;
}

interface PayrollActions {
  setTSheetRows: (rows: TSheetRow[]) => void;
  setBonus: (employeeNumber: string, amount: number) => void;
  setCommission: (employeeNumber: string, amount: number) => void;
  setSalaryUnpaidHours: (employeeNumber: string, hours: number) => void;
  setPayrollConfiguration: (
    configs: Record<string, PayrollEmployeeConfig>,
    issues: PayrollConfigurationIssue[]
  ) => void;
  setPayrollDate: (date: string) => void;
  setCurrentStep: (step: number) => void;
  generatePayrollUpload: () => void;
  generateMasterSummary: () => void;
  markPayrollUploadExported: () => void;
  markMasterSummaryExported: () => void;
  markPayrollRunSaved: (runId: string) => void;
}

const PayrollContext = createContext<(PayrollState & PayrollActions) | null>(null);
const SESSION_STORAGE_KEY = "rba-payroll-run-draft-v3";

const INITIAL_PAYROLL_STATE: PayrollState = {
  tsheetRows: [],
  payrollUploadRows: [],
  masterSummaryGroups: [],
  bonuses: {},
  commissions: {},
  salaryUnpaidHours: {},
  employeeConfigs: {},
  configurationIssues: [],
  payrollDate: "",
  currentStep: 0,
  exportedPayrollUpload: false,
  exportedMasterSummary: false,
  payrollRunSaved: false,
  payrollRunId: "",
};

export function PayrollProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PayrollState>(INITIAL_PAYROLL_STATE);
  const [sessionRestored, setSessionRestored] = useState(false);

  useEffect(() => {
    const restoreDraft = window.setTimeout(() => {
      try {
        const savedDraft = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (savedDraft) {
          const restored = JSON.parse(savedDraft) as Partial<PayrollState>;
          setState({ ...INITIAL_PAYROLL_STATE, ...restored });
        }
      } catch {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        setSessionRestored(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreDraft);
  }, []);

  useEffect(() => {
    if (!sessionRestored) return;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
  }, [sessionRestored, state]);

  useEffect(() => {
    const payrollIsUnfinished =
      state.tsheetRows.length > 0 &&
      !(state.exportedPayrollUpload && state.exportedMasterSummary && state.payrollRunSaved);
    if (!payrollIsUnfinished) return;

    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };

    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [
    state.exportedMasterSummary,
    state.exportedPayrollUpload,
    state.payrollRunSaved,
    state.tsheetRows.length,
  ]);

  const setTSheetRows = useCallback((rows: TSheetRow[]) => {
    setState((s) => ({
      ...s,
      tsheetRows: rows,
      payrollUploadRows: [],
      masterSummaryGroups: [],
      bonuses: Object.fromEntries(
        rows.map((row) => [row.employeeNumber, roundCurrency(row.bonus)])
      ),
      commissions: Object.fromEntries(
        rows.map((row) => [row.employeeNumber, roundCurrency(row.commission)])
      ),
      salaryUnpaidHours: Object.fromEntries(
        rows.map((row) => [row.employeeNumber, totalUnpaidHours(row)])
      ),
      exportedPayrollUpload: false,
      exportedMasterSummary: false,
      payrollRunSaved: false,
      payrollRunId: "",
    }));
  }, []);

  const setBonus = useCallback((employeeNumber: string, amount: number) => {
    setState((s) => ({
      ...s,
      bonuses: { ...s.bonuses, [employeeNumber]: roundCurrency(amount) },
    }));
  }, []);

  const setCommission = useCallback((employeeNumber: string, amount: number) => {
    setState((s) => ({
      ...s,
      commissions: { ...s.commissions, [employeeNumber]: roundCurrency(amount) },
    }));
  }, []);

  const setSalaryUnpaidHours = useCallback((employeeNumber: string, hours: number) => {
    setState((s) => ({
      ...s,
      salaryUnpaidHours: { ...s.salaryUnpaidHours, [employeeNumber]: Math.max(0, hours) },
    }));
  }, []);

  const setPayrollConfiguration = useCallback((
    configs: Record<string, PayrollEmployeeConfig>,
    issues: PayrollConfigurationIssue[]
  ) => {
    setState((s) => ({ ...s, employeeConfigs: configs, configurationIssues: issues }));
  }, []);

  const setPayrollDate = useCallback((date: string) => {
    setState((s) => ({ ...s, payrollDate: date }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const generatePayrollUpload = useCallback(() => {
    setState((s) => {
      const rows = toPayrollUpload(
        s.tsheetRows,
        s.bonuses,
        s.commissions,
        s.salaryUnpaidHours,
        s.employeeConfigs
      );
      const groups = toMasterSummary(rows, s.employeeConfigs);
      return { ...s, payrollUploadRows: rows, masterSummaryGroups: groups, currentStep: 2 };
    });
  }, []);

  const generateMasterSummary = useCallback(() => {
    setState((s) => {
      const groups = toMasterSummary(s.payrollUploadRows, s.employeeConfigs);
      return { ...s, masterSummaryGroups: groups, currentStep: 3 };
    });
  }, []);

  const markPayrollUploadExported = useCallback(() => {
    setState((s) => ({ ...s, exportedPayrollUpload: true }));
  }, []);

  const markMasterSummaryExported = useCallback(() => {
    setState((s) => ({ ...s, exportedMasterSummary: true }));
  }, []);

  const markPayrollRunSaved = useCallback((runId: string) => {
    setState((s) => ({ ...s, payrollRunSaved: true, payrollRunId: runId }));
  }, []);

  return (
    <PayrollContext.Provider
      value={{
        ...state,
        setTSheetRows,
        setBonus,
        setCommission,
        setSalaryUnpaidHours,
        setPayrollConfiguration,
        setPayrollDate,
        setCurrentStep,
        generatePayrollUpload,
        generateMasterSummary,
        markPayrollUploadExported,
        markMasterSummaryExported,
        markPayrollRunSaved,
      }}
    >
      {children}
    </PayrollContext.Provider>
  );
}

export function usePayroll() {
  const ctx = useContext(PayrollContext);
  if (!ctx) throw new Error("usePayroll must be used within PayrollProvider");
  return ctx;
}
