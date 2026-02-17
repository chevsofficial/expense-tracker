export const tableBaseClass =
  "table w-full bg-transparent border-collapse";

export const tableContainerClass = "overflow-x-auto w-full";

export const tableHeadClass =
  "bg-transparent [&>tr>th]:border-b [&>tr>th]:border-neutral-300";

export const tableBodyClass =
  "bg-transparent " +
  "[&>tr>td]:border-b [&>tr>td]:border-neutral-200 " +
  "[&>tr:last-child>td]:border-b-0 " +
  "[&>tr:hover]:bg-neutral-50 transition-colors";
