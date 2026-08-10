import { Request, Response, NextFunction } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

/**
 * GET /challans/:id/pdf
 * Generates and streams a professional PDF for a confirmed Sales Challan.
 */
export const exportChallanPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: { select: { id: true, name: true, email: true, role: true } },
        lineItems: {
          include: { product: { select: { sku: true } } },
        },
      },
    });

    if (!challan) {
      return next(new NotFoundError(`Sales Challan with ID ${id} not found`));
    }

    // Build PDF in-memory
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${challan.challanNumber}.pdf"`
    );

    // Pipe directly to HTTP response
    doc.pipe(res);

    // ── Header ─────────────────────────────────────────────────
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('SALES CHALLAN', { align: 'center' });

    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#666666')
      .text('Mini ERP + CRM Operations Portal', { align: 'center' });

    doc.moveDown(1);

    // Horizontal rule
    doc
      .strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.8);

    // ── Challan Metadata ──────────────────────────────────────
    const metaY = doc.y;
    doc.fillColor('#000000').font('Helvetica-Bold').fontSize(11);
    doc.text(`Challan Number:`, 50, metaY);
    doc.font('Helvetica').text(challan.challanNumber, 180, metaY);

    doc.font('Helvetica-Bold').text(`Status:`, 350, metaY);
    doc.font('Helvetica').text(challan.status, 430, metaY);

    doc.moveDown(0.5);
    const dateY = doc.y;
    doc.font('Helvetica-Bold').text(`Created:`, 50, dateY);
    doc.font('Helvetica').text(new Date(challan.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    }), 180, dateY);

    if (challan.confirmedAt) {
      doc.font('Helvetica-Bold').text(`Confirmed:`, 350, dateY);
      doc.font('Helvetica').text(new Date(challan.confirmedAt).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      }), 430, dateY);
    }

    doc.moveDown(0.5);
    const issuerY = doc.y;
    doc.font('Helvetica-Bold').text(`Issued By:`, 50, issuerY);
    doc.font('Helvetica').text(
      `${challan.creator?.name || 'N/A'} (${challan.creator?.role || 'N/A'})`,
      180, issuerY
    );

    doc.moveDown(1.2);

    // ── Customer Details ──────────────────────────────────────
    doc
      .strokeColor('#cccccc')
      .lineWidth(0.5)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#333333');
    doc.text('BILL TO', 50);
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text(challan.customer?.businessName || 'N/A');
    doc.text(challan.customer?.name || 'N/A');
    doc.text(`Mobile: ${challan.customer?.mobile || 'N/A'}`);
    doc.text(`Email: ${challan.customer?.email || 'N/A'}`);
    if (challan.customer?.gstNumber) {
      doc.text(`GST: ${challan.customer.gstNumber}`);
    }

    doc.moveDown(1);

    // ── Line Items Table ──────────────────────────────────────
    const tableTop = doc.y;
    const colX = { sno: 50, sku: 80, product: 160, qty: 340, price: 400, total: 475 };

    // Table header
    doc
      .rect(50, tableTop, 495, 22)
      .fill('#1e293b');

    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
    doc.text('#', colX.sno + 5, tableTop + 6);
    doc.text('SKU', colX.sku, tableTop + 6);
    doc.text('Product Name', colX.product, tableTop + 6);
    doc.text('Qty', colX.qty, tableTop + 6);
    doc.text('Unit Price', colX.price, tableTop + 6);
    doc.text('Subtotal', colX.total, tableTop + 6);

    // Table rows
    let rowY = tableTop + 24;
    let grandTotal = 0;

    challan.lineItems.forEach((item, idx) => {
      const subtotal = item.quantity * item.unitPriceSnapshot;
      grandTotal += subtotal;
      const isEven = idx % 2 === 0;

      if (isEven) {
        doc.rect(50, rowY - 2, 495, 20).fill('#f8fafc');
      }

      doc.fillColor('#000000').font('Helvetica').fontSize(9);
      doc.text(String(idx + 1), colX.sno + 5, rowY + 2);
      doc.text(item.product?.sku || 'N/A', colX.sku, rowY + 2);
      doc.text(item.productNameSnapshot, colX.product, rowY + 2, { width: 170, ellipsis: true });
      doc.text(String(item.quantity), colX.qty, rowY + 2);
      doc.text(`₹${item.unitPriceSnapshot.toFixed(2)}`, colX.price, rowY + 2);
      doc.font('Helvetica-Bold').text(`₹${subtotal.toFixed(2)}`, colX.total, rowY + 2);

      rowY += 22;

      // Page break safety
      if (rowY > 720) {
        doc.addPage();
        rowY = 50;
      }
    });

    // ── Totals ────────────────────────────────────────────────
    rowY += 8;
    doc
      .strokeColor('#1e293b')
      .lineWidth(1.5)
      .moveTo(350, rowY)
      .lineTo(545, rowY)
      .stroke();

    rowY += 8;
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
    doc.text('Total Quantity:', 350, rowY);
    doc.text(`${challan.totalQuantity} units`, colX.total, rowY);

    rowY += 18;
    doc.fontSize(12).fillColor('#0ea5e9');
    doc.text('GRAND TOTAL:', 350, rowY);
    doc.text(`₹${grandTotal.toFixed(2)}`, colX.total, rowY);

    // ── Footer ────────────────────────────────────────────────
    doc.moveDown(4);
    doc.fontSize(8).fillColor('#999999').font('Helvetica');
    doc.text(
      'This is a system-generated document from the Mini ERP + CRM Operations Portal. ' +
      'Prices shown are point-in-time snapshots taken at challan creation.',
      50,
      doc.y,
      { align: 'center', width: 495 }
    );

    // Finalize the PDF
    doc.end();
  } catch (error) {
    next(error);
  }
};
