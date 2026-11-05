import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/app_state.dart';
import '../services/api_service.dart';
import '../widgets/app_toast.dart';
import 'home_shell.dart';

class SuccessScreen extends StatelessWidget {
  final DeliveryOrder? order;
  final VoidCallback? onDone;

  const SuccessScreen({
    super.key,
    this.order,
    this.onDone,
  });

  static Future<void> show(
    BuildContext context, {
    DeliveryOrder? order,
    VoidCallback? onDone,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (ctx) => SuccessScreen(order: order, onDone: onDone),
    );
  }

  Future<void> _openPdfInvoice(BuildContext context, DeliveryOrder? ord) async {
    if (ord == null) return;
    final pdfUrl = '${ApiService.baseUrl.replaceAll(RegExp(r"/+$"), "")}/sales/invoice-pdf/?ticket_id=${ord.ticketId}';
    final uri = Uri.parse(pdfUrl);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      if (context.mounted) {
        AppToast.error(context, 'Could not open invoice PDF: $e');
      }
    }
  }

  Future<void> _shareOnWhatsApp(BuildContext context, DeliveryOrder? ord) async {
    if (ord == null) return;
    final phone = ord.customer.phone.replaceAll(RegExp(r'\D'), '');
    final dateStr = '${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year}';

    final buffer = StringBuffer();
    buffer.writeln('🧾 *FUTURE GAS - TAX INVOICE*');
    buffer.writeln('──────────────────────────');
    buffer.writeln('*Invoice No:* ${ord.ticketId}');
    buffer.writeln('*Date:* $dateStr');
    buffer.writeln('*Customer:* ${ord.customer.name}');
    if (ord.customer.phone.isNotEmpty) {
      buffer.writeln('*Contact:* ${ord.customer.phone}');
    }
    buffer.writeln('──────────────────────────');
    buffer.writeln('*DELIVERED ITEMS:*');

    double totalTaxable = 0.0;
    double totalGst = 0.0;

    for (final it in ord.items) {
      if (it.deliveryQty > 0) {
        final grossUnit = it.cylinder.price;
        final lineGross = grossUnit * it.deliveryQty;
        final gstRate = it.cylinder.gstPercentage > 0 ? it.cylinder.gstPercentage : 5.0;

        // Inclusive GST Calculation: Taxable = Gross / (1 + GST/100)
        final lineTaxable = lineGross / (1.0 + (gstRate / 100.0));
        final lineTax = lineGross - lineTaxable;
        totalTaxable += lineTaxable;
        totalGst += lineTax;

        final unitTaxable = grossUnit / (1.0 + (gstRate / 100.0));

        buffer.writeln('• ${it.cylinder.weight} × ${it.deliveryQty}');
        buffer.writeln('   Rate: ₹${unitTaxable.toStringAsFixed(2)} | Gross: ₹${lineGross.toStringAsFixed(2)}');
        buffer.writeln('   GST (${gstRate.toStringAsFixed(1)}%): ₹${lineTax.toStringAsFixed(2)}');
      }
      if (it.emptyReturnQty > 0) {
        buffer.writeln('  (Returned: ${it.emptyReturnQty} Empty Cylinders)');
      }
    }

    final cgst = totalGst / 2.0;
    final sgst = totalGst / 2.0;

    buffer.writeln('──────────────────────────');
    buffer.writeln('*TAX & AMOUNT BREAKDOWN:*');
    buffer.writeln('• Taxable Value: ₹${totalTaxable.toStringAsFixed(2)}');
    buffer.writeln('• CGST (2.5%):   ₹${cgst.toStringAsFixed(2)}');
    buffer.writeln('• SGST (2.5%):   ₹${sgst.toStringAsFixed(2)}');
    buffer.writeln('• Total GST:     ₹${totalGst.toStringAsFixed(2)}');
    buffer.writeln('──────────────────────────');
    buffer.writeln('💰 *Total Amount:* ₹${ord.amount.toStringAsFixed(2)}');
    buffer.writeln('*Payment Mode:* ${ord.paymentMethod.toUpperCase()}');
    buffer.writeln('*Status:* Completed / Verified');
    buffer.writeln('──────────────────────────');
    buffer.writeln('📄 *Download Official GST Invoice (PDF):*');
    buffer.writeln('${ApiService.baseUrl.replaceAll(RegExp(r"/+$"), "")}/sales/invoice-pdf/?ticket_id=${ord.ticketId}');
    buffer.writeln('──────────────────────────');
    buffer.writeln('Thank you for choosing Future Gas!');

    final invoiceText = buffer.toString();
    final urlStr = phone.isNotEmpty
        ? 'https://wa.me/$phone?text=${Uri.encodeComponent(invoiceText)}'
        : 'https://wa.me/?text=${Uri.encodeComponent(invoiceText)}';

    final uri = Uri.parse(urlStr);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      if (context.mounted) {
        AppToast.error(context, 'Could not open WhatsApp: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);
    final activeOrder = order ?? (state.orders.isNotEmpty ? state.orders.first : null);

    return Container(
      padding: EdgeInsets.fromLTRB(20, 12, 20, 20 + MediaQuery.of(context).padding.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: Color(0xFFE2E8F0), width: 1),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Drag handle
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // Success Header Icon
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFBBF7D0), width: 1.5),
            ),
            child: const Center(
              child: Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF16A34A),
                size: 28,
              ),
            ),
          ),
          const SizedBox(height: 12),

          Text(
            'Delivery Confirmed',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),

          if (activeOrder != null)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Text(
                    activeOrder.ticketId,
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF475569),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  '•  ${activeOrder.time}',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ],
            ),

          const SizedBox(height: 16),

          // Order Receipt Card
          if (activeOrder != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              activeOrder.customer.name,
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (activeOrder.customer.phone.isNotEmpty)
                              Text(
                                activeOrder.customer.phone,
                                style: GoogleFonts.inter(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            '₹${activeOrder.amount.toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              activeOrder.paymentMethod.toUpperCase(),
                              style: GoogleFonts.inter(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF334155),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 10),

                  // Items row
                  Row(
                    children: [
                      const Icon(Icons.propane_tank_outlined, size: 15, color: Color(0xFF800020)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          activeOrder.cylinderSummary.isNotEmpty
                              ? activeOrder.cylinderSummary
                              : '${activeOrder.totalCylinders} Delivered  •  ${activeOrder.totalEmpties} Empty Returned',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF475569),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          const SizedBox(height: 18),

          // Action Buttons: WhatsApp & View PDF
          Row(
            children: [
              // WhatsApp Invoice Button (Clean, elegant, non-glaring)
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _shareOnWhatsApp(context, activeOrder),
                  icon: const Icon(Icons.chat_bubble_outline_rounded, size: 16, color: Color(0xFF16A34A)),
                  label: Text(
                    'WhatsApp',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF16A34A),
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: Color(0xFF86EFAC), width: 1.2),
                    backgroundColor: const Color(0xFFF0FDF4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // View / Print PDF Button
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _openPdfInvoice(context, activeOrder),
                  icon: const Icon(Icons.picture_as_pdf_outlined, size: 16, color: Color(0xFF800020)),
                  label: Text(
                    'View PDF',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF800020),
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: Color(0xFFFECACA), width: 1.2),
                    backgroundColor: const Color(0xFFFEF2F2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 10),

          // Done / Home Button (Clean Burgundy)
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                if (onDone != null) {
                  onDone!();
                } else {
                  Navigator.pop(context);
                  state.resetDelivery();
                  Navigator.pushAndRemoveUntil(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const HomeShell(initialIndex: 0),
                    ),
                    (route) => false,
                  );
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF800020),
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
              child: Text(
                'Done',
                style: GoogleFonts.inter(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
