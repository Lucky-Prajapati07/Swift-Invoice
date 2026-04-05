import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib"
import QRCode from "qrcode"
import { readFile } from "fs/promises"
import path from "path"
import { getInvoiceDetail } from "@/lib/actions/user-modules"

function toPdfText(value: unknown) {
  const raw = String(value ?? "")
  return raw.replace(/[^\x20-\x7E\n\r\t]/g, "")
}

function n(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDate(value: unknown) {
  if (!value) return "-"
  const date = new Date(String(value))
  if (Number.isNaN(date.getTime())) return "-"
  return date.toLocaleDateString("en-GB")
}

function fitText(value: unknown, fallback = "-") {
  const text = toPdfText(value || fallback)
  return text.length ? text : fallback
}

async function embedImageByType(page: any, source: string, bytes: Buffer) {
  const lower = source.toLowerCase()
  const prefersPng = lower.includes(".png") || lower.includes("image/png")

  if (prefersPng) {
    try {
      return await page.doc.embedPng(bytes)
    } catch {
      return await page.doc.embedJpg(bytes)
    }
  }

  try {
    return await page.doc.embedJpg(bytes)
  } catch {
    return await page.doc.embedPng(bytes)
  }
}

async function drawLogo(page: any, logoUrl: unknown, x: number, y: number, width: number, height: number, requestOrigin?: string) {
  const source = String(logoUrl || "").trim()
  if (!source) return

  try {
    if (source.startsWith("data:image/")) {
      const base64 = source.split(",")[1]
      if (!base64) return
      const imageBytes = Buffer.from(base64, "base64")
      const image = await embedImageByType(page, source, imageBytes)
      page.drawImage(image, { x, y, width, height })
      return
    }

    // Relative paths are stored in DB as /uploads/logos/<file>.png
    if (source.startsWith("/") || !/^https?:\/\//i.test(source)) {
      const normalized = source.startsWith("/") ? source.slice(1) : source
      const localPath = path.join(process.cwd(), "public", normalized)
      try {
        const localBytes = await readFile(localPath)
        const image = await embedImageByType(page, source, localBytes)
        page.drawImage(image, { x, y, width, height })
        return
      } catch {
        // Fallback to absolute URL if local file is not accessible.
        if (requestOrigin) {
          const response = await fetch(new URL(source.startsWith("/") ? source : `/${source}`, requestOrigin))
          if (response.ok) {
            const bytes = Buffer.from(await response.arrayBuffer())
            const image = await embedImageByType(page, source, bytes)
            page.drawImage(image, { x, y, width, height })
            return
          }
        }
      }
    }

    if (/^https?:\/\//i.test(source)) {
      const response = await fetch(source)
      if (!response.ok) return
      const arrayBuffer = await response.arrayBuffer()
      const bytes = Buffer.from(arrayBuffer)
      const image = await embedImageByType(page, source, bytes)
      page.drawImage(image, { x, y, width, height })
    }
  } catch {
    // Ignore invalid or unreachable logo sources.
  }
}

function wrapTextToWidth(font: any, text: string, size: number, width: number) {
  const paragraphs = toPdfText(text).split("\n")
  const lines: string[] = []

  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (words.length === 0) {
      lines.push("")
      return
    }

    let currentLine = words[0]
    for (let i = 1; i < words.length; i += 1) {
      const candidate = `${currentLine} ${words[i]}`
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        currentLine = candidate
      } else {
        lines.push(currentLine)
        currentLine = words[i]
      }
    }
    lines.push(currentLine)
  })

  return lines
}

function drawMultilineText(page: any, font: any, text: string, x: number, y: number, width: number, size = 7, lineHeight = 9) {
  const lines = wrapTextToWidth(font, text, size, width)
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * lineHeight, size, font, maxWidth: width })
  })
}

function drawTextBlock(page: any, font: any, bold: any, title: string, rows: Array<[string, string]>, x: number, y: number, lineHeight = 9) {
  page.drawText(title, { x, y, size: 9.8, font: bold })
  rows.forEach((row, index) => {
    page.drawText(`${row[0]} : ${row[1]}`, { x, y: y - 15 - index * lineHeight, size: 8.9, font })
  })
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const data = await getInvoiceDetail(id)

    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 })
    }

    const invoice = data.invoice as any
    const items = data.items as any[]

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89])
    ;(page as any).doc = pdfDoc
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const L = 24
    const R = 571
    const T = 818
    const B = 36
    const lineColor = rgb(0.32, 0.32, 0.32)
    const mid = (L + R) / 2
    const pageCenter = (L + R) / 2
    const width = R - L

    page.drawRectangle({ x: L, y: B, width, height: T - B, borderColor: lineColor, borderWidth: 0.8 })

    const headerH = 104
    const headerTop = T
    const headerBottom = T - headerH
    const dividerY = headerTop - 34
    const logoSize = Math.max(24, Math.min(38, headerH * 0.38 + 2))
    const logoY = dividerY - 4 - logoSize
    page.drawLine({ start: { x: L, y: headerBottom }, end: { x: R, y: headerBottom }, thickness: 0.8, color: lineColor })
    page.drawText("Page No. 1 of 1", { x: L + 4, y: T - 13, size: 9, font })
    page.drawText("Original Copy", { x: R - 92, y: T - 13, size: 9, font })

    page.drawText("INVOICE", {
      x: pageCenter - bold.widthOfTextAtSize("INVOICE", 15) / 2,
      y: headerTop - 25,
      size: 15,
      font: bold,
    })
    page.drawLine({ start: { x: L, y: dividerY }, end: { x: R, y: dividerY }, thickness: 0.8, color: lineColor })

    await drawLogo(page, invoice.business_logo_url, L + 6, logoY, logoSize, logoSize, request.nextUrl.origin)

    const companyName = fitText(invoice.business_legal_name || invoice.business_display_name || invoice.business_name || "Company Name")
    page.drawText(companyName, {
      x: pageCenter - bold.widthOfTextAtSize(companyName, 14) / 2,
      y: headerTop - 60,
      size: 14,
      font: bold,
    })

    const addr = [invoice.business_address, invoice.business_place, invoice.business_state_code, invoice.business_pincode]
      .filter(Boolean)
      .map((part) => String(part))
      .join(", ") || "Address"

    const gstin = `GSTIN: ${fitText(invoice.business_gst_number, "-")}`
    page.drawText(fitText(addr), {
      x: pageCenter - font.widthOfTextAtSize(fitText(addr), 9.2) / 2,
      y: headerTop - 76,
      size: 9.2,
      font,
      maxWidth: 360,
    })
    page.drawText(gstin, {
      x: pageCenter - font.widthOfTextAtSize(gstin, 9) / 2,
      y: headerTop - 90,
      size: 9.2,
      font,
    })

    const contactLine = `Contact No: ${fitText(invoice.business_phone)}   EMAIL: ${fitText(invoice.business_email)}   WEBSITE: ${fitText(invoice.business_website_url)}`
    page.drawText(contactLine, {
      x: pageCenter - font.widthOfTextAtSize(contactLine, 8.2) / 2,
      y: headerTop - 102,
      size: 9.2,
      font,
      maxWidth: width - 70,
    })

    page.drawText(
      `Invoice: ${fitText(invoice.invoice_number)} | Generated on: ${new Date().toLocaleString("en-GB")}`,
      { x: pageCenter - 148, y: 10, size: 8.5, font },
    )
    let y = headerBottom

    const invRows: Array<[string, string]> = [
      ["Invoice Number", fitText(invoice.invoice_number)],
      ["Invoice Date", formatDate(invoice.invoice_date)],
      ["Due Date", formatDate(invoice.due_date)],
      ["Place Of Supply", fitText(invoice.place_of_supply || invoice.place_of_supply_state_code)],
    ]

    const transportRows: Array<[string, string]> = [
      ["Transport Mode", fitText(invoice.transport_mode)],
      ["Dispatch Name", fitText(invoice.dispatch_name)],
      ["Dispatch Place", fitText(invoice.dispatch_from_place || invoice.dispatch_place)],
      ["Dispatch Pincode", fitText(invoice.dispatch_pincode)],
    ]

    const block1LineHeight = 10.8
    const block1Rows = Math.max(invRows.length, transportRows.length)
    const block1H = 28 + block1Rows * block1LineHeight
    const block1Bottom = y - block1H
    page.drawLine({ start: { x: mid, y }, end: { x: mid, y: block1Bottom }, thickness: 0.6, color: lineColor })

    drawTextBlock(page, font, bold, "Invoice Details", invRows, L + 6, y - 12, block1LineHeight)
    drawTextBlock(page, font, bold, "Transporter Details", transportRows, mid + 6, y - 12, block1LineHeight)

    y = block1Bottom
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.8, color: lineColor })

    const block2H = 100
    const block2Bottom = y - block2H
    page.drawLine({ start: { x: mid, y }, end: { x: mid, y: block2Bottom }, thickness: 0.6, color: lineColor })

    const billRows: Array<[string, string]> = [
      ["", fitText(invoice.recipient_legal_name || invoice.party_name || invoice.client_name)],
      ["GSTIN", fitText(invoice.party_gstin || invoice.client_gst_number)],
      ["", fitText(invoice.recipient_address || invoice.client_address)],
      ["", fitText([invoice.recipient_place, invoice.recipient_state_code, invoice.recipient_pincode].filter(Boolean).join(" - "))],
    ]

    const shipRows: Array<[string, string]> = [
      ["", fitText(invoice.shipping_name || invoice.recipient_legal_name || invoice.party_name || invoice.client_name)],
      ["GSTIN", fitText(invoice.shipping_to_gstin || invoice.client_gst_number)],
      ["", fitText(invoice.shipping_address || invoice.recipient_address || invoice.client_address)],
      ["", fitText([invoice.shipping_to_state, invoice.shipping_to_state_code, invoice.shipping_to_pincode].filter(Boolean).join(" - "))],
    ]

    page.drawText("Billing Details", { x: L + 6, y: y - 14, size: 10, font: bold })
    page.drawText("Shipping Details", { x: mid + 6, y: y - 14, size: 10, font: bold })

    billRows.forEach((row, idx) => {
      const text = row[0] ? `${row[0]}: ${row[1]}` : row[1]
      page.drawText(text, { x: L + 6, y: y - 30 - idx * 14, size: 9, font, maxWidth: mid - L - 12 })
    })

    shipRows.forEach((row, idx) => {
      const text = row[0] ? `${row[0]}: ${row[1]}` : row[1]
      page.drawText(text, { x: mid + 6, y: y - 30 - idx * 14, size: 9, font, maxWidth: R - mid - 12 })
    })

    y = block2Bottom
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.8, color: lineColor })

    const stripH = 18
    const stripBottom = y - stripH
    page.drawLine({ start: { x: L + width * 0.52, y }, end: { x: L + width * 0.52, y: stripBottom }, thickness: 0.5, color: lineColor })
    // page.drawLine({ start: { x: L + width * 0.72, y }, end: { x: L + width * 0.72, y: stripBottom }, thickness: 0.5, color: lineColor })
    // page.drawText(`IRN: ${fitText(invoice.irn, "-")}`, { x: L + 6, y: y - 12, size: 7, font: bold })
    // page.drawText(`Ack No.: ${fitText(invoice.ack_no, "-")}`, { x: L + width * 0.53, y: y - 12, size: 7, font: bold })
    // page.drawText(`Ack Date: ${formatDate(invoice.ack_date || invoice.document_date)}`, { x: L + width * 0.73, y: y - 12, size: 7, font: bold })

    // y = stripBottom
    page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 0.8, color: lineColor })

    const renderItems = items.filter(Boolean)
    const rowCount = Math.max(renderItems.length, 1)
    const headerRowH = 18
    const rowHeight = 18
    const tableH = headerRowH + rowCount * rowHeight
    const tableBottom = y - tableH
    page.drawRectangle({ x: L, y: tableBottom, width, height: tableH, borderColor: lineColor, borderWidth: 0.8 })

    const cols = [
      L,
      L + 18,
      L + 180,
      L + 232,
      L + 264,
      L + 296,
      L + 350,
      L + 396,
      L + 438,
      R,
    ]
    cols.slice(1, -1).forEach((x) => {
      page.drawLine({ start: { x, y }, end: { x, y: tableBottom }, thickness: 0.45, color: lineColor })
    })

    page.drawRectangle({ x: L, y: y - headerRowH, width, height: headerRowH, color: rgb(0.9, 0.9, 0.9) })
    page.drawLine({ start: { x: L, y: y - headerRowH }, end: { x: R, y: y - headerRowH }, thickness: 0.45, color: lineColor })
    cols.slice(1, -1).forEach((x) => {
      page.drawLine({ start: { x, y }, end: { x, y: y - headerRowH }, thickness: 0.55, color: lineColor })
    })

    const headerY = y - 13
    page.drawText("Sr.", { x: cols[0] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("Item Description", { x: cols[1] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("HSN/SAC", { x: cols[2] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("Qty", { x: cols[3] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("Unit", { x: cols[4] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("List Price", { x: cols[5] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("Disc.", { x: cols[6] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("Tax %", { x: cols[7] + 4, y: headerY, size: 8.7, font: bold })
    page.drawText("Amount", { x: cols[8] + 4, y: headerY, size: 8.7, font: bold })

    for (let i = 0; i < rowCount; i += 1) {
      const rowTop = y - headerRowH - i * rowHeight
      const rowBottom = rowTop - rowHeight
      page.drawLine({ start: { x: L, y: rowBottom }, end: { x: R, y: rowBottom }, thickness: 0.35, color: lineColor })

      const item = renderItems[i]
      if (!item) continue

      const qty = n(item.quantity)
      const price = n(item.rate)
      const disc = n(item.discount_percent)
      const tax = n(item.tax_percent)
      const amount = n(item.amount)

      page.drawText(String(i + 1), { x: cols[0] + 5, y: rowTop - 13, size: 8.8, font })
      page.drawText(fitText(item.description).slice(0, 24), { x: cols[1] + 4, y: rowTop - 13, size: 8.8, font })
      page.drawText(fitText(item.hsn_code), { x: cols[2] + 4, y: rowTop - 13, size: 8.8, font })
      page.drawText(String(qty), { x: cols[3] + 4, y: rowTop - 13, size: 8.8, font })
      page.drawText("Nos", { x: cols[4] + 4, y: rowTop - 13, size: 8.8, font })
      page.drawText(price.toFixed(2), { x: cols[5] + 4, y: rowTop - 13, size: 8.8, font })
      page.drawText(`${disc.toFixed(2)}%`, { x: cols[6] + 4, y: rowTop - 13, size: 8.8, font })
      page.drawText(tax.toFixed(2), { x: cols[7] + 4, y: rowTop - 13, size: 8.8, font })
      page.drawText(amount.toFixed(2), { x: cols[8] + 4, y: rowTop - 13, size: 8.8, font })
    }

    y = tableBottom
    const summaryH = 72
    const summaryBottom = y - summaryH
    page.drawRectangle({ x: L, y: summaryBottom, width, height: summaryH, borderColor: lineColor, borderWidth: 0.8 })

    const totalTax = n(invoice.total_tax)
    const cgst = n(invoice.cgst_amount || totalTax / 2)
    const sgst = n(invoice.sgst_amount || totalTax / 2)
    const igst = n(invoice.igst_amount)

    // Calculate total discount from all items
    const totalDiscount = items.reduce((sum, item) => {
      const qty = n(item.quantity)
      const price = n(item.rate)
      const discountPercent = n(item.discount_percent)
      const itemDiscount = qty * price * (discountPercent / 100)
      return sum + itemDiscount
    }, 0)

    page.drawText("Discount", { x: L + 12, y: y - 20, size: 10, font })
    page.drawText("Total", { x: L + 12, y: y - 40, size: 10, font })
    page.drawText(`- INR ${totalDiscount.toFixed(2)}`, { x: R - 10 - font.widthOfTextAtSize(`- INR ${totalDiscount.toFixed(2)}`, 10), y: y - 20, size: 10, font })
    page.drawText(`INR ${n(invoice.total_amount).toFixed(2)}`, { x: R - 10 - bold.widthOfTextAtSize(`INR ${n(invoice.total_amount).toFixed(2)}`, 10), y: y - 40, size: 10, font: bold })

    const leftTotals = `Assessable Value: INR ${n(invoice.subtotal).toFixed(2)}`
    const rightTotals = `CGST: INR ${cgst.toFixed(2)}   SGST: INR ${sgst.toFixed(2)}   IGST: INR ${igst.toFixed(2)}`
    page.drawText(leftTotals, { x: L + 12, y: y - 60, size: 10, font: bold })
    page.drawText(rightTotals, { x: L + width * 0.36, y: y - 60, size: 10, font: bold })

    y = summaryBottom

    const footerTop = y
    const col1 = L + width * 0.25
    const col2 = L + width * 0.5
    const col3 = L + width * 0.75
    const termsText = String(
      invoice.terms_conditions ||
        invoice.terms ||
        "1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. may be charged on delayed payment.\n3. Subject to local jurisdiction only.",
    )
    const termsWidth = col1 - L - 12
    const termsLineCount = Math.max(1, wrapTextToWidth(font, termsText, 9, termsWidth).length)
    const termsBlockH = 34 + termsLineCount * 11
    const bankBlockH = 108
    const qrBlockH = 122
    const signBlockH = 84
    const footerH = Math.max(termsBlockH, bankBlockH, qrBlockH, signBlockH)
    const footerBottom = footerTop - footerH

    // Draw footer border rectangle
    page.drawRectangle({ x: L, y: footerBottom, width, height: footerH, borderColor: lineColor, borderWidth: 0.8 })

    // Draw column dividers within footer
    page.drawLine({ start: { x: col1, y: footerTop }, end: { x: col1, y: footerBottom }, thickness: 0.5, color: lineColor })
    page.drawLine({ start: { x: col2, y: footerTop }, end: { x: col2, y: footerBottom }, thickness: 0.5, color: lineColor })
    page.drawLine({ start: { x: col3, y: footerTop }, end: { x: col3, y: footerBottom }, thickness: 0.5, color: lineColor })

    page.drawText("Terms and Conditions", { x: L + 6, y: footerTop - 16, size: 10, font: bold })
    drawMultilineText(page, font, termsText, L + 6, footerTop - 34, termsWidth, 9, 11)

    page.drawText("Bank Details", { x: col1 + 6, y: footerTop - 16, size: 10, font: bold })
    page.drawText(`Account Number : ${fitText(invoice.bank_account_number)}`, { x: col1 + 6, y: footerTop - 34, size: 9, font })
    page.drawText(`Bank: ${fitText(invoice.bank_name)}`, { x: col1 + 6, y: footerTop - 54, size: 9, font })
    page.drawText(`IFSC : ${fitText(invoice.bank_ifsc)}`, { x: col1 + 6, y: footerTop - 74, size: 9, font })
    page.drawText(`Branch: ${fitText(invoice.branch || invoice.bank_branch)}`, { x: col1 + 6, y: footerTop - 94, size: 9, font })

    page.drawText("E-Invoice QR", {
      x: col2 + (col3 - col2) / 2 - bold.widthOfTextAtSize("E-Invoice QR", 10) / 2,
      y: footerTop - 16,
      size: 10,
      font: bold,
    })
    page.drawRectangle({ x: col2 + 20, y: footerTop - 116, width: col3 - col2 - 40, height: 92, borderColor: lineColor, borderWidth: 0.7 })

    try {
      const qrPayload = JSON.stringify({
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        supplier: invoice.business_name || "",
        recipient: invoice.recipient_legal_name || invoice.party_name || invoice.client_name || "",
        totalInvoiceValue: n(invoice.total_amount).toFixed(2),
      })
      const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 256, margin: 1, errorCorrectionLevel: "M" })
      const qrBase64 = qrDataUrl.split(",")[1]
      if (qrBase64) {
        const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, "base64"))
        page.drawImage(qrImage, { x: col2 + 24, y: footerTop - 112, width: col3 - col2 - 48, height: 84 })
      }
    } catch {
      page.drawText("QR unavailable", { x: col2 + 40, y: footerTop - 68, size: 9, font })
    }

    const signCompany = fitText(invoice.business_display_name || invoice.business_name || invoice.business_legal_name || "Company Name")
    const signPrefix = "For "
    const signText = `${signPrefix}${signCompany}`
    const signX = col3 + 8
    const signMaxWidth = R - signX - 8
    const signWords = signText.split(/\s+/).filter(Boolean)
    const signLines: string[] = []
    let currentSignLine = ""

    signWords.forEach((word) => {
      const candidate = currentSignLine ? `${currentSignLine} ${word}` : word
      if (bold.widthOfTextAtSize(candidate, 10) <= signMaxWidth) {
        currentSignLine = candidate
      } else {
        if (currentSignLine) signLines.push(currentSignLine)
        currentSignLine = word
      }
    })

    if (currentSignLine) signLines.push(currentSignLine)
    signLines.slice(0, 2).forEach((line, index) => {
      page.drawText(line, { x: signX, y: footerBottom + 52 - index * 12, size: 10, font: bold })
    })
    page.drawText("Authorized Signatory", { x: col3 + 8, y: footerBottom + 20, size: 10, font: bold })

    const pdfBytes = await pdfDoc.save()
    const shouldDownload = request.nextUrl.searchParams.get("download") === "1"

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${shouldDownload ? "attachment" : "inline"}; filename="${invoice.invoice_number}.pdf"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("Invoice PDF generation failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    const status = message === "Unauthorized" ? 401 : 500
    return NextResponse.json({ error: message === "Unauthorized" ? "Unauthorized" : "Failed to generate invoice PDF" }, { status })
  }
}
