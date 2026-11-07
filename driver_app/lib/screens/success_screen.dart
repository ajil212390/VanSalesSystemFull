import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import '../services/invoice_helper.dart';
import 'home_shell.dart';

class SuccessScreen extends StatefulWidget {
  final DeliveryOrder? order;
  final File? preloadedPdf;
  final VoidCallback? onDone;
  final bool startInProcessingMode;
  final AppState? appState;

  const SuccessScreen({
    super.key,
    this.order,
    this.preloadedPdf,
    this.onDone,
    this.startInProcessingMode = false,
    this.appState,
  });

  /// Opens the modern half-screen modal, processes the delivery submission,
  /// downloads the invoice PDF in the background with sleek animation,
  /// and smoothly transitions into the clean delivery success screen.
  static Future<void> processAndShow(
    BuildContext context, {
    required AppState state,
    VoidCallback? onDone,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (ctx) => SuccessScreen(
        startInProcessingMode: true,
        appState: state,
        onDone: onDone,
      ),
    );
  }

  /// Direct display of the success screen for an existing delivery order
  static Future<void> show(
    BuildContext context, {
    DeliveryOrder? order,
    File? preloadedPdf,
    VoidCallback? onDone,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      isDismissible: false,
      enableDrag: false,
      builder: (ctx) => SuccessScreen(
        order: order,
        preloadedPdf: preloadedPdf,
        onDone: onDone,
        startInProcessingMode: false,
      ),
    );
  }

  @override
  State<SuccessScreen> createState() => _SuccessScreenState();
}

class _SuccessScreenState extends State<SuccessScreen> with TickerProviderStateMixin {
  late bool _isProcessing;
  int _processingStep = 1; // 1: Submitting, 2: PDF, 3: WhatsApp ready
  String _processingStage = 'Recording delivery in system...';
  String? _errorMessage;

  DeliveryOrder? _activeOrder;
  File? _downloadedPdf;
  bool _isSharingWhatsApp = false;
  String? _shareNotice;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  late AnimationController _successAnimController;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _isProcessing = widget.startInProcessingMode;
    _activeOrder = widget.order;
    _downloadedPdf = widget.preloadedPdf;

    // Smooth breathing pulse animation for the modern loading indicator
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );
    _pulseAnimation = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _pulseController.repeat(reverse: true);

    // Dynamic pop-in animation for success checkmark
    _successAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 550),
    );
    _scaleAnimation = CurvedAnimation(
      parent: _successAnimController,
      curve: Curves.easeOutBack,
    );

    if (_isProcessing && widget.appState != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _executeSubmissionFlow(widget.appState!);
      });
    } else {
      _successAnimController.forward();
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _successAnimController.dispose();
    super.dispose();
  }

  Future<void> _executeSubmissionFlow(AppState state) async {
    try {
      setState(() {
        _processingStep = 1;
        _processingStage = 'Recording Delivery...';
        _errorMessage = null;
      });

      final ok = await state.completeDelivery();
      if (!mounted) return;

      if (!ok) {
        setState(() {
          _isProcessing = false;
          _errorMessage = 'Failed to submit delivery. Please check stock or connection.';
        });
        return;
      }

      // Order created successfully
      final lastOrder = state.orders.isNotEmpty ? state.orders.first : null;
      setState(() {
        _activeOrder = lastOrder;
        _processingStep = 2;
        _processingStage = 'Generating Tax Invoice...';
      });

      if (lastOrder != null) {
        final pdf = await InvoiceHelper.downloadInvoicePdf(
          lastOrder.ticketId,
          salesId: lastOrder.salesId,
        );
        if (mounted) {
          setState(() {
            _downloadedPdf = pdf;
            _processingStep = 3;
            _processingStage = 'Invoice Ready for WhatsApp';
          });
        }
      }

      state.syncFromBackend();

      // Brief polished pause so the driver sees completion
      await Future.delayed(const Duration(milliseconds: 350));
      if (!mounted) return;

      setState(() {
        _isProcessing = false;
      });
      _successAnimController.forward(from: 0.0);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isProcessing = false;
        _errorMessage = 'Error finalizing delivery: $e';
      });
    }
  }

  Future<void> _shareOnWhatsApp() async {
    final ord = _activeOrder;
    if (ord == null) return;

    setState(() {
      _isSharingWhatsApp = true;
      _shareNotice = null;
    });

    try {
      File? pdf = _downloadedPdf;
      if (pdf == null || !await pdf.exists()) {
        pdf = await InvoiceHelper.downloadInvoicePdf(
          ord.ticketId,
          salesId: ord.salesId,
        );
        if (mounted && pdf != null) {
          setState(() => _downloadedPdf = pdf);
        }
      }

      if (!mounted) return;
      final pdfExists = pdf != null && await pdf.exists();
      if (!mounted) return;

      String phone = ord.customer.phone.trim();
      if (phone.isEmpty) {
        final state = widget.appState ?? AppStateProvider.of(context);
        try {
          final matched = state.customers.firstWhere(
            (c) => (ord.customer.ledgerId != null && c.ledgerId == ord.customer.ledgerId) ||
                   (c.name.trim().toLowerCase() == ord.customer.name.trim().toLowerCase()),
          );
          phone = matched.phone.trim();
        } catch (_) {}
      }

      bool shareSuccess = false;
      if (pdfExists) {
        shareSuccess = await InvoiceHelper.shareDirectToWhatsApp(
          context: context,
          pdfFile: pdf,
          ticketId: ord.ticketId,
          customerName: ord.customer.name,
          customerPhone: phone,
        );
      } else {
        shareSuccess = await InvoiceHelper.sharePdfToWhatsApp(
          context: context,
          ticketId: ord.ticketId,
          customerName: ord.customer.name,
          customerPhone: phone,
          salesId: ord.salesId,
        );
      }

      if (!shareSuccess && mounted) {
        setState(() {
          _shareNotice = 'Could not open WhatsApp directly. Shared via system.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _shareNotice = 'Share note: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _isSharingWhatsApp = false);
      }
    }
  }

  String _numberFormatEnIn(double val) {
    final parts = val.toStringAsFixed(2).split('.');
    String whole = parts[0];
    final dec = parts[1];

    if (whole.length > 3) {
      final lastThree = whole.substring(whole.length - 3);
      String remaining = whole.substring(0, whole.length - 3);
      final reg = RegExp(r'(\d+?)(?=(\d{2})+$)');
      remaining = remaining.replaceAllMapped(reg, (m) => '${m[1]},');
      whole = '$remaining,$lastThree';
    }
    return '$whole.$dec';
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).padding.bottom;
    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.88,
      ),
      padding: EdgeInsets.fromLTRB(18, 12, 18, 16 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
        ),
      ),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 260),
        child: _isProcessing
            ? _buildModernLoadingContent()
            : (_errorMessage != null ? _buildErrorContent() : _buildSuccessContent()),
      ),
    );
  }

  // ================= 1. PREMIUM MINIMALIST MODERN LOADING UI =================
  Widget _buildModernLoadingContent() {
    return SizedBox(
      key: const ValueKey('loading_view'),
      height: 380,
      width: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Top drag handle
          Container(
            width: 38,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Spacer(),

          // Single-Focus Sleek Pulsing Circular Beacon (No Clutter, Pure Modern Polish)
          ScaleTransition(
            scale: _pulseAnimation,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer subtle halo
                Container(
                  width: 88,
                  height: 88,
                  decoration: const BoxDecoration(
                    color: Color(0x12800020),
                    shape: BoxShape.circle,
                  ),
                ),
                // Crisp White Elevated Card with 1.5px Burgundy Border
                Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    border: Border.all(color: const Color(0xFF800020), width: 1.5),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x18000000),
                        blurRadius: 12,
                        offset: Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      // Smooth Burgundy Circular Progress Spinner
                      const SizedBox(
                        width: 52,
                        height: 52,
                        child: CircularProgressIndicator(
                          strokeWidth: 3.0,
                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF800020)),
                        ),
                      ),
                      // Dynamic Icon Transition
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 250),
                        child: Icon(
                          _processingStep >= 2
                              ? Icons.receipt_long_rounded
                              : Icons.local_shipping_rounded,
                          key: ValueKey(_processingStep),
                          color: const Color(0xFF800020),
                          size: 26,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 22),

          // Dynamic Headline
          AnimatedSwitcher(
            duration: const Duration(milliseconds: 200),
            child: Text(
              _processingStage,
              key: ValueKey(_processingStage),
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF0F172A),
                letterSpacing: -0.4,
              ),
            ),
          ),
          const SizedBox(height: 6),

          // Clean Subtitle
          Text(
            'Updating van stock • Preparing Tax Invoice',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 20),

          // Sleek Minimalist Burgundy Progress Line
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: const SizedBox(
              width: 150,
              height: 3.5,
              child: LinearProgressIndicator(
                backgroundColor: Color(0xFFF1F5F9),
                valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF800020)),
              ),
            ),
          ),
          const SizedBox(height: 10),

          const Spacer(),
          const SizedBox(height: 10),
        ],
      ),
    );
  }

  // ================= 2. ERROR VIEW =================
  Widget _buildErrorContent() {
    return SizedBox(
      key: const ValueKey('error_view'),
      height: 380,
      width: double.infinity,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 38,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const Spacer(),
          Container(
            width: 62,
            height: 62,
            decoration: const BoxDecoration(
              color: Color(0xFF800020),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: Color(0x14000000),
                  blurRadius: 8,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: const Center(
              child: Icon(Icons.close_rounded, color: Colors.white, size: 34),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Submission Failed',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              _errorMessage ?? 'An error occurred while saving the delivery.',
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF64748B)),
            ),
          ),
          const Spacer(),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF800020),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: Text(
                'Back to Delivery',
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ================= 3. SOLID, BOLD DELIVERY SUCCESS VIEW =================
  Widget _buildSuccessContent() {
    final state = AppStateProvider.of(context);
    final activeOrder = _activeOrder ?? (state.orders.isNotEmpty ? state.orders.first : null);

    final amountText = activeOrder != null
        ? '₹${_numberFormatEnIn(activeOrder.amount)}'
        : '₹0.00';
    final paymentMode = (activeOrder?.paymentMethod ?? 'CASH').toUpperCase();
    final customerName = activeOrder?.customer.name ?? 'Customer';
    final customerPhone = activeOrder?.customer.phone ?? '';
    final ticketId = activeOrder?.ticketId ?? '';

    // Extract delivered cylinders and returned empties
    List<DeliveryItem> deliveredItems = activeOrder?.items.where((i) => i.deliveryQty > 0).toList() ?? [];
    List<DeliveryItem> returnItems = activeOrder?.items.where((i) => i.emptyReturnQty > 0).toList() ?? [];
    if (deliveredItems.isEmpty && state.deliveryItems.any((i) => i.deliveryQty > 0)) {
      deliveredItems = state.deliveryItems.where((i) => i.deliveryQty > 0).toList();
    }
    if (returnItems.isEmpty && state.deliveryItems.any((i) => i.emptyReturnQty > 0)) {
      returnItems = state.deliveryItems.where((i) => i.emptyReturnQty > 0).toList();
    }
    final int totalDelivered = activeOrder?.totalCylinders != null && activeOrder!.totalCylinders > 0
        ? activeOrder.totalCylinders
        : deliveredItems.fold(0, (s, i) => s + i.deliveryQty);
    final int totalEmpties = activeOrder?.totalEmpties != null && activeOrder!.totalEmpties > 0
        ? activeOrder.totalEmpties
        : returnItems.fold(0, (s, i) => s + i.emptyReturnQty);

    return SingleChildScrollView(
      key: const ValueKey('success_view'),
      physics: const BouncingScrollPhysics(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Top drag handle
          Container(
            width: 38,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0xFFE2E8F0),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 12),

          // 1. Header: Delivery Checkmark & Title
          ScaleTransition(
            scale: _scaleAnimation,
            child: Container(
              width: 58,
              height: 58,
              decoration: BoxDecoration(
                color: const Color(0xFFFDF2F4),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFFCE7EC), width: 1.5),
              ),
              child: Center(
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: Color(0xFF800020),
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Color(0x18800020),
                        blurRadius: 8,
                        offset: Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.check_rounded,
                      color: Colors.white,
                      size: 26,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),

          Text(
            'Delivery Completed',
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w900,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.4,
            ),
          ),
          const SizedBox(height: 3),

          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (ticketId.isNotEmpty)
                Text(
                  'Bill #$ticketId',
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF64748B),
                  ),
                ),
              if (ticketId.isNotEmpty)
                Text(
                  '  •  ',
                  style: GoogleFonts.inter(color: const Color(0xFFCBD5E1), fontSize: 12),
                ),
              Text(
                activeOrder?.time ?? 'Just now',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFF94A3B8),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 2. Customer & Payment Overview Strip
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Row(
              children: [
                // Customer Avatar
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDF2F4),
                    borderRadius: BorderRadius.circular(9),
                    border: Border.all(color: const Color(0xFFFCE7EC)),
                  ),
                  child: Center(
                    child: Text(
                      customerName.isNotEmpty ? customerName[0].toUpperCase() : 'C',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF800020),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // Customer Name & Phone
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        customerName,
                        style: GoogleFonts.inter(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        customerPhone.isNotEmpty ? customerPhone : 'Direct Customer',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),

                // Amount & Payment Pill
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      amountText,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: paymentMode == 'CREDIT' ? const Color(0xFFFEF3C7) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(4),
                        border: Border.all(
                          color: paymentMode == 'CREDIT' ? const Color(0xFFFDE68A) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Text(
                        paymentMode,
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: paymentMode == 'CREDIT' ? const Color(0xFF92400E) : const Color(0xFF334155),
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 3. CYLINDERS DELIVERED & RETURNED SECTION (Detailed Delivery Breakdown)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.1),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Delivered Cylinders Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.propane_tank_rounded, size: 15, color: Color(0xFF800020)),
                        const SizedBox(width: 6),
                        Text(
                          'CYLINDERS DELIVERED',
                          style: GoogleFonts.inter(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF800020),
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDF2F4),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '$totalDelivered Filled',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF800020),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Delivered Cylinders List
                if (deliveredItems.isNotEmpty)
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: deliveredItems.map((item) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              '${item.deliveryQty}×',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF800020),
                              ),
                            ),
                            const SizedBox(width: 5),
                            Text(
                              item.cylinder.weight,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  )
                else
                  Text(
                    'No cylinders recorded',
                    style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF94A3B8)),
                  ),

                const SizedBox(height: 10),
                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                const SizedBox(height: 10),

                // Empty Returns Header Row
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.autorenew_rounded, size: 14, color: Color(0xFF475569)),
                        const SizedBox(width: 6),
                        Text(
                          'EMPTY RETURNS',
                          style: GoogleFonts.inter(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF475569),
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      '$totalEmpties Returned',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                if (returnItems.isNotEmpty)
                  Wrap(
                    spacing: 8,
                    runSpacing: 6,
                    children: returnItems.map((item) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.autorenew_rounded, size: 12, color: Color(0xFF64748B)),
                            const SizedBox(width: 4),
                            Text(
                              '${item.emptyReturnQty}×',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                                color: const Color(0xFF334155),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Text(
                              item.cylinder.weight,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  )
                else
                  Text(
                    'No empty cylinders returned',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 10),

          // 4. GST Tax Invoice Ready Pill
          

          if (_shareNotice != null) ...[
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                _shareNotice!,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF475569),
                ),
              ),
            ),
          ],
          const SizedBox(height: 14),

          // 5. Action Buttons Row: [Share on WhatsApp (White BG + Burgundy Border)] | [Done (Solid Burgundy)]
          Row(
            children: [
              Expanded(
                flex: 6,
                child: SizedBox(
                  height: 48,
                  child: OutlinedButton(
                    onPressed: _isSharingWhatsApp ? null : _shareOnWhatsApp,
                    style: OutlinedButton.styleFrom(
                      backgroundColor: Colors.white,
                      side: const BorderSide(color: Color(0xFF800020), width: 1.5),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 10),
                    ),
                    child: _isSharingWhatsApp
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.2,
                              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF800020)),
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Image.asset(
                                'assets/images/whatsapp_logo.png',
                                width: 20,
                                height: 20,
                                fit: BoxFit.contain,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Share on WhatsApp',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF800020),
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
              const SizedBox(width: 10),

              Expanded(
                flex: 4,
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: () {
                      if (widget.onDone != null) {
                        widget.onDone!();
                      } else {
                        Navigator.pop(context);
                        state.resetDelivery();
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(builder: (_) => const HomeShell()),
                          (route) => false,
                        );
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF800020),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      'Done',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
        ],
      ),
    );
  }
}
