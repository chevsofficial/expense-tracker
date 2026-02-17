// components/ui/tableStyles.ts

// New canonical names
export const tableBaseClass = "table w-full bg-transparent border-collapse";

export const tableHeadClass =
  "bg-transparent [&>tr>th]:border-b [&>tr>th]:border-neutral-300";

export const tableBodyClass =
  "bg-transparent " +
  "[&>tr>td]:border-b [&>tr>td]:border-neutral-200 " +
  "[&>tr:last-child>td]:border-b-0 " +
  "[&>tr:hover]:bg-neutral-50 transition-colors";

export const tableContainerClass = "overflow-x-auto w-full";

// Backwards-compatible aliases (so existing imports keep working)
export const tableClass = tableBaseClass;
export const tableHeadClassName = tableHeadClass;
export const tableBodyDividerClass = tableBodyClass;
