import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts } from "pdf-lib"
import { getInvoiceExportRows } from "@/lib/actions/user-modules"

function csvEscape(value: string | number | null) {
  const text = value === null ? "" : String(value)
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") || undefined
  const to = request.nextUrl.searchParams.get("to") || undefined
  const clientId = request.nextUrl.searchParams.get("clientId") || undefined
  const status = request.nextUrl.searchParams.get("status") || undefined
  const format = request.nextUrl.searchParams.get("format") || "csv"

  const rows = await getInvoiceExportRows({ from, to, clientId, status })

  if (format === "pdf") {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89])
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    let y = 800
    page.drawText("Sales Report", { x: 50, y, size: 20, font: bold })
    y -= 28
    page.drawText(`Rows: ${rows.length}`, { x: 50, y, size: 11, font })
    y -= 22

    page.drawText("Invoice", { x: 50, y, size: 10, font: bold })
    page.drawText("Date", { x: 130, y, size: 10, font: bold })
    page.drawText("Client", { x: 210, y, size: 10, font: bold })
    page.drawText("Status", { x: 360, y, size: 10, font: bold })
    page.drawText("Total", { x: 460, y, size: 10, font: bold })
    y -= 14

    for (const row of rows) {
      if (y < 60) break
      page.drawText(row.invoiceNumber, { x: 50, y, size: 9, font })
      page.drawText(String(row.invoiceDate), { x: 130, y, size: 9, font })
      page.drawText(row.client.slice(0, 24), { x: 210, y, size: 9, font })
      page.drawText(row.status, { x: 360, y, size: 9, font })
      page.drawText(row.total.toFixed(2), { x: 460, y, size: 9, font })
      y -= 13
    }

    const bytes = await pdfDoc.save()
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="sales-report.pdf"',
        "Cache-Control": "no-store",
      },
    })
  }

  const header = ["Invoice Number", "Invoice Date", "Due Date", "Status", "Client", "Subtotal", "Tax", "Total"]
  const lines = [
    header.map((cell) => csvEscape(cell)).join(","),
    ...rows.map((row: any) =>
      [
        row.invoiceNumber,
        row.invoiceDate,
        row.dueDate || "",
        row.status,
        row.client,
        row.subtotal.toFixed(2),
        row.tax.toFixed(2),
        row.total.toFixed(2),
      ]
        .map((cell) => csvEscape(cell))
        .join(","),
    ),
  ]

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="sales-report.csv"',
      "Cache-Control": "no-store",
    },
  })
}
