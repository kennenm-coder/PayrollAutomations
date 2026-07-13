import type { DepartmentSection } from "./types";

const GROUP_TO_DEPARTMENT: Record<string, DepartmentSection> = {
  "Administration Employees": "OFFICE",
  "Installation Employees": "INSTALL CREW",
  "Paint/Stain Employees": "PAINTERS",
  "Production Employees": "PAINTERS",
  "Events Employees": "EVENTS TEAM",
  "Proximity Marketing": "NEIGHBORHOOD ENGAGEMENT TEAM",
  "Retail Marketing": "OFFICE",
  "Hourly Sales Team": "OUTSIDE SALES",
  "PI/Service": "PI/SERVICE",
  "Management": "SALARIED",
  "Measure Techs": "SALARIED",
  "-": "SALARIED",
};

export function mapGroupToDepartment(group: string, salaried: boolean): DepartmentSection {
  if (salaried) {
    return "SALARIED";
  }
  return GROUP_TO_DEPARTMENT[group] ?? "OFFICE";
}

export const DEPARTMENT_ORDER: DepartmentSection[] = [
  "OUTSIDE SALES",
  "SALARIED",
  "OFFICE",
  "NEIGHBORHOOD ENGAGEMENT TEAM",
  "EVENTS TEAM",
  "PAINTERS",
  "PI/SERVICE",
  "INSTALL CREW",
];
