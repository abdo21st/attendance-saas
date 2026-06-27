export type {
  ReportField,
  ReportFilter,
} from "./report-definitions";

export {
  DATA_SOURCES,
  getFieldsForSource,
  getDefaultFields,
} from "./report-definitions";

export const OPERATORS = [
  { value: "equals", label: "يساوي" },
  { value: "not_equals", label: "لا يساوي" },
  { value: "contains", label: "يحتوي على" },
  { value: "greater_than", label: "أكبر من" },
  { value: "less_than", label: "أقل من" },
  { value: "between", label: "بين" },
  { value: "in", label: "في" },
];
