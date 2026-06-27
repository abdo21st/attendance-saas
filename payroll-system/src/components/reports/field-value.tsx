interface FieldValueProps {
  value: any;
  type: "text" | "number" | "date" | "currency" | "percentage";
}

export function FieldValue({ value, type }: FieldValueProps) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;

  switch (type) {
    case "currency":
      return <span dir="ltr" className="tabular-nums">{Number(value).toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>;
    case "percentage":
      return <span dir="ltr" className="tabular-nums">%{Number(value).toFixed(1)}</span>;
    case "number":
      return <span dir="ltr" className="tabular-nums">{Number(value).toLocaleString("ar-EG")}</span>;
    case "date":
      return <span>{new Date(value).toLocaleDateString("ar-EG")}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}
