import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Shift } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

const LINE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SHIFTS = ["AM", "PM", "BW"] as const;

type ExportRecord = {
  date: Date;
  shift: Shift;
  submittedAt: Date;
  employee: {
    name: string;
    department: string | null;
  };
} & Record<`line${number}Nid`, number>;

function isShift(value: string | null): value is Shift {
  return value === "AM" || value === "PM" || value === "BW";
}

function lineHeader(line: number) {
  return `${line} L / NID`;
}

type StyledCell = XLSX.CellObject & {
  s?: Record<string, unknown>;
};

function styleCell(cell: XLSX.CellObject | undefined, style: Record<string, unknown>) {
  if (!cell) return;
  (cell as StyledCell).s = style;
}

function applyTableStyle(sheet: XLSX.WorkSheet, range: XLSX.Range, totalRow: number) {
  const border = {
    top: { style: "thin", color: { rgb: "222222" } },
    bottom: { style: "thin", color: { rgb: "222222" } },
    left: { style: "thin", color: { rgb: "222222" } },
    right: { style: "thin", color: { rgb: "222222" } },
  };
  const headerStyle = {
    fill: { fgColor: { rgb: "B7B7B7" } },
    font: { bold: true, color: { rgb: "111111" } },
    alignment: { horizontal: "center", vertical: "center", wrapText: true },
    border,
  };
  const bodyStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    border,
  };
  const totalLabelStyle = {
    fill: { fgColor: { rgb: "D9B300" } },
    font: { bold: true, color: { rgb: "111111" } },
    alignment: { horizontal: "center", vertical: "center" },
    border,
  };
  const totalValueStyle = {
    font: { bold: true, color: { rgb: "111111" } },
    alignment: { horizontal: "center", vertical: "center" },
    border,
  };

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[address];
      if (row === range.s.r) styleCell(cell, headerStyle);
      else if (row === totalRow && col === range.s.c) styleCell(cell, totalLabelStyle);
      else if (row === totalRow) styleCell(cell, totalValueStyle);
      else styleCell(cell, bodyStyle);
    }
  }
}

function buildPerAgentSheet(records: ExportRecord[], shifts: readonly Shift[]) {
  const rows: Array<Array<string | number | XLSX.CellObject>> = [];
  const tableRanges: Array<{ range: XLSX.Range; totalRow: number }> = [];

  shifts.forEach((shiftName, shiftIndex) => {
    if (shiftIndex > 0) rows.push([]);

    const shiftRecords = records.filter((record) => record.shift === shiftName);
    const headerRowIndex = rows.length;
    rows.push([`Store Name-${shiftName} shift`, ...LINE_NUMS.map(lineHeader)]);

    const firstDataRow = rows.length;
    if (shiftRecords.length > 0) {
      shiftRecords.forEach((record) => {
        rows.push([
          record.employee.name,
          ...LINE_NUMS.map((line) => record[`line${line}Nid`] || ""),
        ]);
      });
    } else {
      rows.push(["", ...LINE_NUMS.map(() => "")]);
    }

    const lastDataRow = rows.length - 1;
    const totalRow = rows.length;
    rows.push([
      `Total ${shiftName}`,
      ...LINE_NUMS.map((_, lineIndex) => {
        const column = XLSX.utils.encode_col(lineIndex + 1);
        return {
          t: "n",
          f: `SUM(${column}${firstDataRow + 1}:${column}${lastDataRow + 1})`,
          v: shiftRecords.reduce((sum, record) => sum + (record[`line${lineIndex + 1}Nid`] || 0), 0),
        } satisfies XLSX.CellObject;
      }),
    ]);

    tableRanges.push({
      range: {
        s: { r: headerRowIndex, c: 0 },
        e: { r: totalRow, c: LINE_NUMS.length },
      },
      totalRow,
    });
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 28 },
    ...LINE_NUMS.map(() => ({ wch: 13 })),
  ];
  sheet["!rows"] = rows.map((_, index) => ({
    hpt: tableRanges.some(({ range }) => range.s.r === index) ? 34 : 20,
  }));

  tableRanges.forEach(({ range, totalRow }) => applyTableStyle(sheet, range, totalRow));

  return sheet;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user.role;

  if (!session || (role !== "MANAGER" && role !== "TEAM_LEADER" && role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const shift = searchParams.get("shift");
  const targetDate = new Date(date);

  const records = await prisma.healthCheck.findMany({
    where: {
      date: targetDate,
      ...(isShift(shift) ? { shift } : {}),
    },
    include: {
      employee: { select: { name: true, department: true } },
    },
    orderBy: [{ shift: "asc" }, { submittedAt: "asc" }],
  });

  const workbook = XLSX.utils.book_new();
  const shiftsToRender = isShift(shift) ? [shift] : SHIFTS;
  XLSX.utils.book_append_sheet(workbook, buildPerAgentSheet(records, shiftsToRender), "Per Agent");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", cellStyles: true });
  const filename = `vf-health-check-${date}${shift ? `-${shift}` : ""}.xlsx`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
