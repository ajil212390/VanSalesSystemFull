import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/app_state.dart';
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

  Future<void> _shareOnWhatsApp(BuildContext context, DeliveryOrder? ord) async {
    if (ord == null) return;
    final phone = ord.customer.phone.replaceAll(RegExp(r'\D'), '');
    final dateStr = '${DateTime.now().day.toString().padLeft(2, '0')}/${DateTime.now().month.toString().padLeft(2, '0')}/${DateTime.now().year}';

    final buffer = StringBuffer();
    buffer.writeln('🧾 *FUTURE GAS - DELIVERY INVOICE*');
    buffer.writeln('──────────────────────────');
    buffer.writeln('*Invoice No:* ${ord.ticketId}');
    buffer.writeln('*Date:* $dateStr');
    buffer.writeln('*Customer:* ${ord.customer.name}');
    if (ord.customer.phone.isNotEmpty) {
      buffer.writeln('*Contact:* ${ord.customer.phone}');
    }
    buffer.writeln('──────────────────────────');
    buffer.writeln('*Items Delivered:*');
    for (final it in ord.items) {
      if (it.deliveryQty > 0) {
        buffer.writeln('• ${it.cylinder.weight} LPG Cylinder × ${it.deliveryQty}');
      }
      if (it.emptyReturnQty > 0) {
        buffer.writeln('  (Returned: ${it.emptyReturnQty} Empty)');
      }
    }
    buffer.writeln('──────────────────────────');
    buffer.writeln('*Total Amount:* ₹${ord.amount.toStringAsFixed(2)}');
    buffer.writeln('*Payment Mode:* ${ord.paymentMethod.toUpperCase()}');
    buffer.writeln('*Status:* Completed / Verified');
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
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not open WhatsApp: $e'),
            backgroundColor: const Color(0xFF800020),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);
    final activeOrder = order ?? (state.orders.isNotEmpty ? state.orders.first : null);

    return Container(
      padding: EdgeInsets.fromLTRB(20, 14, 20, 20 + MediaQuery.of(context).padding.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [
          BoxShadow(
            color: Color(0x2A000000),
            blurRadius: 24,
            offset: Offset(0, -6),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Drag handle
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFCBD5E1),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 16),

          // Success Header Icon
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFF800020).withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(
                Icons.check_circle_rounded,
                color: Color(0xFF800020),
                size: 32,
              ),
            ),
          ),
          const SizedBox(height: 12),

          Text(
            'Delivery Completed',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          if (activeOrder != null)
            Text(
              activeOrder.ticketId,
              style: GoogleFonts.jetBrainsMono(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF64748B),
              ),
            ),

          const SizedBox(height: 16),

          // Order Summary Card
          if (activeOrder != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          activeOrder.customer.name,
                          style: GoogleFonts.inter(
                            fontSize: 14.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        '₹${activeOrder.amount.toStringAsFixed(0)}',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF800020),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 8),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.propane_tank_rounded, size: 14, color: Color(0xFF800020)),
                          const SizedBox(width: 4),
                          Text(
                            '${activeOrder.totalCylinders} Delivered  •  ${activeOrder.totalEmpties} Empty',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFF800020).withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          activeOrder.paymentMethod.toUpperCase(),
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF800020),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

          const SizedBox(height: 20),

          // Action Buttons: WhatsApp & Done
          Row(
            children: [
              // WhatsApp Invoice Button
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => _shareOnWhatsApp(context, activeOrder),
                  icon: const Icon(Icons.share_rounded, size: 16),
                  label: Text(
                    'WhatsApp Invoice',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF25D366),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 13),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              // Done / Home Button
              Expanded(
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
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: Text(
                    'Done',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
