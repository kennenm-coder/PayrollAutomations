"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  TSheetRow,
  PayrollUploadRow,
  DepartmentGroup,
  PayrollEmployeeConfig,
  PayrollConfigurationIssue,
} from "./types";
import { toPayrollUpload, toMasterSummary } from "./transform";

interface PayrollState {
  tsheetRows: TSheetRow[];
  payrollUploadRows: PayrollUploadRow[];
  masterSummaryGroups: DepartmentGroup[];
  bonuses: Record<string, number>;
  commissions: Record<string, number>;
  employeeConfigs: Record<string, PayrollEmployeeConfig>;
  configurationIssues: PayrollConfigurationIssue[];
  payrollDate: string;
  currentStep: number;
}

interface PayrollActions {
  setTSheetRows: (rows: TSheetRow[]) => void;
  setBonus: (employeeNumber: string, amount: number) => void;
  setCommission: (employeeNumber: string, amount: number) => void;
  setPayrollConfiguration: (
    configs: Record<string, PayrollEmployeeConfig>,
    issues: PayrollConfigurationIssue[]
  ) => void;
  setPayrollDate: (date: string) => void;
  setCurrentStep: (step: number) => void;
  generatePayrollUpload: () => void;
  generateMasterSummary: () => void;
}

const PayrollContext = createContext<(PayrollState & PayrollActions) | null>(null);

export function PayrollProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PayrollState>({
    tsheetRows: [],
    payrollUploadRows: [],
    masterSummaryGroups: [],
    bonuses: {},
    commissions: {},
    employeeConfigs: {},
    configurationIssues: [],
    payrollDate: "",
    currentStep: 0,
  });

  const setTSheetRows = useCallback((rows: TSheetRow[]) => {
    setState((s) => ({ ...s, tsheetRows: rows }));
  }, []);

  const setBonus = useCallback((employeeNumber: string, amount: number) => {
    setState((s) => ({
      ...s,
      bonuses: { ...s.bonuses, [employeeNumber]: amount },
    }));
  }, []);

  const setCommission = useCallback((employeeNumber: string, amount: number) => {
    setState((s) => ({
      ...s,
      commissions: { ...s.commissions, [employeeNumber]: amount },
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

  return (
    <PayrollContext.Provider
      value={{
        ...state,
        setTSheetRows,
        setBonus,
        setCommission,
        setPayrollConfiguration,
        setPayrollDate,
        setCurrentStep,
        generatePayrollUpload,
        generateMasterSummary,
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
