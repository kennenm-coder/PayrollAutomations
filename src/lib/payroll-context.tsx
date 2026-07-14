"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { TSheetRow, PayrollUploadRow, DepartmentGroup } from "./types";
import { toPayrollUpload, toMasterSummary } from "./transform";

interface Deductions {
  healthIns: number;
  dentalIns: number;
  otherIns: number;
  reimb: number;
  fourOhOneK: number;
  garnish: number;
}

interface PayrollState {
  tsheetRows: TSheetRow[];
  payrollUploadRows: PayrollUploadRow[];
  masterSummaryGroups: DepartmentGroup[];
  bonuses: Record<string, number>;
  commissions: Record<string, number>;
  employeeRates: Record<string, number>;
  deductions: Record<string, Deductions>;
  payrollDate: string;
  currentStep: number;
}

interface PayrollActions {
  setTSheetRows: (rows: TSheetRow[]) => void;
  setBonus: (employeeNumber: string, amount: number) => void;
  setCommission: (employeeNumber: string, amount: number) => void;
  setEmployeeRate: (employeeNumber: string, rate: number) => void;
  setDeduction: (employeeNumber: string, field: keyof Deductions, amount: number) => void;
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
    employeeRates: {},
    deductions: {},
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

  const setEmployeeRate = useCallback((employeeNumber: string, rate: number) => {
    setState((s) => ({
      ...s,
      employeeRates: { ...s.employeeRates, [employeeNumber]: rate },
    }));
  }, []);

  const setDeduction = useCallback(
    (employeeNumber: string, field: keyof Deductions, amount: number) => {
      setState((s) => ({
        ...s,
        deductions: {
          ...s.deductions,
          [employeeNumber]: {
            ...(s.deductions[employeeNumber] ?? {
              healthIns: 0, dentalIns: 0, otherIns: 0, reimb: 0, fourOhOneK: 0, garnish: 0,
            }),
            [field]: amount,
          },
        },
      }));
    },
    []
  );

  const setPayrollDate = useCallback((date: string) => {
    setState((s) => ({ ...s, payrollDate: date }));
  }, []);

  const setCurrentStep = useCallback((step: number) => {
    setState((s) => ({ ...s, currentStep: step }));
  }, []);

  const generatePayrollUpload = useCallback(() => {
    setState((s) => {
      const rows = toPayrollUpload(s.tsheetRows, s.bonuses, s.commissions);
      const groups = toMasterSummary(rows, s.tsheetRows, s.employeeRates, s.deductions);
      return { ...s, payrollUploadRows: rows, masterSummaryGroups: groups, currentStep: 2 };
    });
  }, []);

  const generateMasterSummary = useCallback(() => {
    setState((s) => {
      const groups = toMasterSummary(
        s.payrollUploadRows,
        s.tsheetRows,
        s.employeeRates,
        s.deductions
      );
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
        setEmployeeRate,
        setDeduction,
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
