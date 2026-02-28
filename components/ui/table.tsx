import React from "react";

type TableProps = React.HTMLAttributes<HTMLTableElement>

const Table: React.FC<TableProps> = ({ className, ...props }) => (
  <div className="w-full overflow-auto">
    <table
      className={`w-full caption-bottom text-sm ${className || ""}`}
      {...props}
    />
  </div>
);

type TableHeaderProps = React.HTMLAttributes<HTMLTableSectionElement>

const TableHeader: React.FC<TableHeaderProps> = ({ className, ...props }) => (
  <thead className={`[&_tr]:border-b ${className || ""}`} {...props} />
);

type TableBodyProps = React.HTMLAttributes<HTMLTableSectionElement>

const TableBody: React.FC<TableBodyProps> = ({ className, ...props }) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className || ""}`} {...props} />
);

type TableFooterProps = React.HTMLAttributes<HTMLTableSectionElement>

const TableFooter: React.FC<TableFooterProps> = ({ className, ...props }) => (
  <tfoot
    className={`border-t bg-gray-100 font-medium [&_tr]:last:text-base ${className || ""}`}
    {...props}
  />
);

type TableRowProps = React.HTMLAttributes<HTMLTableRowElement>

const TableRow: React.FC<TableRowProps> = ({ className, ...props }) => (
  <tr
    className={`border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-100 ${className || ""}`}
    {...props}
  />
);

type TableHeadProps = React.HTMLAttributes<HTMLTableCellElement>

const TableHead: React.FC<TableHeadProps> = ({ className, ...props }) => (
  <th
    className={`h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 ${className || ""}`}
    {...props}
  />
);

type TableCellProps = React.HTMLAttributes<HTMLTableCellElement>

const TableCell: React.FC<TableCellProps> = ({ className, ...props }) => (
  <td
    className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className || ""}`}
    {...props}
  />
);

type TableCaptionProps = React.HTMLAttributes<HTMLTableCaptionElement>

const TableCaption: React.FC<TableCaptionProps> = ({ className, ...props }) => (
  <caption className={`mt-4 text-sm text-gray-500 ${className || ""}`} {...props} />
);

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
