import * as XLSX from "xlsx";
import { formatDate, formatFee } from "@/lib/format";
import type { RegistrationRosterRow } from "@/lib/registration-roster";

type LabelRow = Pick<RegistrationRosterRow, "paid" | "entryFee" | "entryCurrency" | "role" | "entryStatus" | "memberStatus">;

export function paymentLabel(row: LabelRow): string {
  if (!row.paid) return "Unpaid";
  return `Paid ${formatFee(row.entryFee, row.entryCurrency)}`;
}

export function statusLabel(row: LabelRow): string {
  if (row.role === "CAPTAIN") return `Captain · ${row.entryStatus}`;
  return `Member · ${row.memberStatus ?? "—"}`;
}

const COLUMNS = [
  { header: "NAME", width: 24 },
  { header: "PHONE", width: 16 },
  { header: "EMAIL", width: 28 },
  { header: "AGE", width: 8 },
  { header: "CITY", width: 20 },
  { header: "CATEGORY", width: 20 },
  { header: "TEAM / CREW", width: 22 },
  { header: "CHOREOGRAPHER", width: 24 },
  { header: "ADDRESS", width: 32 },
  { header: "MUSIC FILE", width: 30 },
  { header: "SONG LINK", width: 60 },
  { header: "PAYMENT", width: 18 },
  { header: "STATUS", width: 22 },
  { header: "REGISTERED AT", width: 24 },
] as const;

function sheetRows(rows: RegistrationRosterRow[]) {
  return rows.map((row) => ({
    NAME: row.name ?? (row.username ? `@${row.username}` : "—"),
    PHONE: row.phone ?? "",
    EMAIL: row.email ?? "",
    AGE: row.age ?? "",
    CITY: row.auditionCity ?? "",
    CATEGORY: row.categoryName,
    "TEAM / CREW": row.teamName ?? "",
    CHOREOGRAPHER: row.choreographerName ?? "",
    ADDRESS: row.address ?? "",
    "MUSIC FILE": row.musicFileName ?? "",
    "SONG LINK": row.musicFileUrl ?? "",
    PAYMENT: paymentLabel(row),
    STATUS: statusLabel(row),
    "REGISTERED AT": row.createdAt ? formatDate(row.createdAt) : "",
  }));
}

export function downloadRosterXlsx(rows: RegistrationRosterRow[], filenameBase: string) {
  if (rows.length === 0) return;

  const sheet = sheetRows(rows);
  const worksheet = XLSX.utils.json_to_sheet(sheet);
  worksheet["!cols"] = COLUMNS.map((column) => ({ wch: column.width }));

  const songLinkColumn = COLUMNS.findIndex((column) => column.header === "SONG LINK");
  rows.forEach((row, index) => {
    if (!row.musicFileUrl) return;
    const address = XLSX.utils.encode_cell({ r: index + 1, c: songLinkColumn });
    const cell = worksheet[address] as XLSX.CellObject | undefined;
    if (cell) cell.l = { Target: row.musicFileUrl, Tooltip: "Open song" };
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
  XLSX.writeFile(workbook, `${filenameBase}-registrations.xlsx`);
}
