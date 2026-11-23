import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import '../services/invoice_helper.dart';
import '../widgets/app_toast.dart';

class OrdersScreen extends StatefulWidget {
  final int initialFilterIndex;
  const OrdersScreen({super.key, this.initialFilterIndex = 0});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> with WidgetsBindingObserver {
  late int _activeFilterIndex;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();
  final Set<String> _expandedOrders = {}; // Track which order cards have items expanded

  @override
  void initState() {
    super.initState();
    _activeFilterIndex = widget.initialFilterIndex;
    WidgetsBinding.instance.addObserver(this);
    _searchFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final state = AppStateProvider.of(context);
      state.syncFromBackend();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      if (!mounted) return;
      final appState = AppStateProvider.of(context);
      appState.syncFromBackend();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);

    // Filter by payment method (Cash, UPI / Bank)
    final cashOrders = state.orders.where((o) {
      final m = o.paymentMethod.toLowerCase();
      return m == 'cash' || (m == 'split' && (o.cashAmount ?? 0) > 0);
    }).toList();
    final upiOrders = state.orders.where((o) {
      final m = o.paymentMethod.toLowerCase();
      return m.contains('upi') || m.contains('bank') || m.contains('online') || (m == 'split' && (o.upiAmount ?? 0) > 0);
    }).toList();

    List<DeliveryOrder> displayOrders;
    if (_activeFilterIndex == 1) {
      displayOrders = cashOrders;
    } else if (_activeFilterIndex == 2) {
      displayOrders = upiOrders;
    } else {
      displayOrders = state.orders;
    }

    // Filter by search query
    if (_searchQuery.trim().isNotEmpty) {
      final query = _searchQuery.toLowerCase().trim();
      displayOrders = displayOrders.where((o) {
        final nameMatches = o.customer.name.toLowerCase().contains(query);
        final ticketMatches = o.ticketId.toLowerCase().contains(query);
        final shopMatches = o.customer.shopId?.toLowerCase().contains(query) ?? false;
        final phoneMatches = o.customer.phone.contains(query);
        return nameMatches || ticketMatches || shopMatches || phoneMatches;
      }).toList();
    }

    return GestureDetector(
      behavior: HitTestBehavior.translucent,
      onTap: () {
        FocusScope.of(context).unfocus();
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        appBar: AppBar(
          backgroundColor: const Color(0xFFF8FAFC),
          elevation: 0,
          scrolledUnderElevation: 0,
          automaticallyImplyLeading: false,
          centerTitle: false,
          toolbarHeight: 56,
          titleSpacing: 16,
          title: Text(
            'Sales',
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.4,
            ),
          ),
        ),
        body: RefreshIndicator(
          color: const Color(0xFF800020),
          backgroundColor: Colors.white,
          onRefresh: () async {
            await state.syncFromBackend();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Shift Locked Notice if driver already submitted End Shift
                if (state.isShiftLocked)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFF5C2CB)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.lock_outline_rounded, size: 16, color: Color(0xFF800020)),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Shift End submitted. Sales are locked awaiting Godown settlement verification.',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF800020),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                // TOP: TODAY'S SALES SUMMARY CARD
                _buildTodaySalesSummaryCard(state),

                // 1. SEARCH BAR JUST BELOW SUMMARY CARD
                _buildSearchBar(),

              const SizedBox(height: 12),

              // 2. SMOOTH ANIMATED TOGGLE JUST BELOW SEARCH BAR (All, Cash, UPI / Bank)
              _buildAnimatedSegmentedToggle(),

              const SizedBox(height: 14),

              // 3. SALES LIST
              if (displayOrders.isEmpty)
                _buildEmptyState(context, state)
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayOrders.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 10),
                  itemBuilder: (context, index) {
                    final order = displayOrders[index];
                    return _buildOrderCard(context, state, order);
                  },
                ),

              // Responsive bottom clearance for floating pill navbar & classic 3-button navigation
              SizedBox(height: 84 + MediaQuery.of(context).padding.bottom),
            ],
          ),
        ),
      ),
    ),
  );
}

  // ================= 1. SEARCH BAR =================
  Widget _buildSearchBar() {
    final isFocused = _searchFocusNode.hasFocus;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      height: 46,
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9), // Light distinctive slate background
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isFocused ? const Color(0xFF800020) : const Color(0xFFCBD5E1),
          width: isFocused ? 1.4 : 1.0,
        ),
      ),
      child: Center(
        child: TextField(
          controller: _searchController,
          focusNode: _searchFocusNode,
          cursorColor: const Color(0xFF800020),
          cursorWidth: 2.0,
          cursorRadius: const Radius.circular(2),
          onChanged: (val) => setState(() => _searchQuery = val),
          style: GoogleFonts.inter(
            fontSize: 13.5,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF0F172A),
          ),
          decoration: InputDecoration(
            hintText: 'Search customer name, phone, ticket #...',
            hintStyle: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF94A3B8),
            ),
            prefixIcon: Icon(
              Icons.search_rounded,
              color: isFocused ? const Color(0xFF800020) : const Color(0xFF64748B),
              size: 20,
            ),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    splashRadius: 18,
                    icon: const Icon(Icons.cancel_rounded, size: 18, color: Color(0xFF64748B)),
                    onPressed: () {
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                  )
                : null,
            border: InputBorder.none,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
      ),
    );
  }

  // ================= 2. SMOOTH ANIMATED SEGMENTED TOGGLE (ZERO GLOW, SLIDING PILL) =================
  Widget _buildAnimatedSegmentedToggle() {
    final tabs = ['All', 'Cash', 'UPI / Bank'];

    return Container(
      height: 42,
      padding: const EdgeInsets.all(3.5),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(11),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final tabWidth = constraints.maxWidth / tabs.length;
          return Stack(
            children: [
              // Smooth sliding indicator
              AnimatedPositioned(
                duration: const Duration(milliseconds: 250),
                curve: Curves.fastOutSlowIn,
                left: _activeFilterIndex * tabWidth,
                top: 0,
                bottom: 0,
                width: tabWidth,
                child: Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF800020),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF6B001B), width: 0.8),
                  ),
                ),
              ),
              // Tab items
              Row(
                children: List.generate(tabs.length, (index) {
                  final isSelected = _activeFilterIndex == index;
                  return Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        FocusScope.of(context).unfocus();
                        if (_activeFilterIndex != index) {
                          HapticFeedback.selectionClick();
                          setState(() => _activeFilterIndex = index);
                        }
                      },
                      child: Center(
                        child: AnimatedDefaultTextStyle(
                          duration: const Duration(milliseconds: 200),
                          style: GoogleFonts.inter(
                            fontSize: 12.5,
                            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                            color: isSelected ? Colors.white : const Color(0xFF64748B),
                            letterSpacing: isSelected ? 0.1 : 0,
                          ),
                          child: Text(tabs[index]),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }


  // ================= TOP SUMMARY: TODAY'S SALES OVERVIEW CARD =================
  Widget _buildTodaySalesSummaryCard(AppState state) {
    final double totalRevenue = state.orders.fold(0.0, (sum, o) => sum + o.amount);
    final double cashTotal = state.orders
        .where((o) => o.paymentMethod.toLowerCase() == 'cash')
        .fold(0.0, (sum, o) => sum + o.amount);
    final double upiTotal = totalRevenue - cashTotal;
    final int totalDeliveredCyls = state.orders.fold(0, (sum, o) => sum + o.totalCylinders);
    final int totalReturnedEmpties = state.orders.fold(0, (sum, o) => sum + o.totalEmpties);

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x060F172A),
            blurRadius: 10,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Today's Sales",
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  "${state.orders.length} DELIVERIES",
                  style: GoogleFonts.inter(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF475569),
                    letterSpacing: 0.3,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                "₹${totalRevenue.toStringAsFixed(0)}",
                style: GoogleFonts.inter(
                  fontSize: 26,
                  fontWeight: FontWeight.w900,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  "$totalDeliveredCyls Cyls delivered • $totalReturnedEmpties returned",
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF64748B),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFFF1F5F9)),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF800020),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      "Cash: ",
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                    Text(
                      "₹${cashTotal.toStringAsFixed(0)}",
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: Color(0xFF0284C7),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      "UPI / Bank: ",
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                    Text(
                      "₹${upiTotal.toStringAsFixed(0)}",
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  String _shortName(String weight) {
    final w = weight.trim();
    if (w.isEmpty) return 'Item';
    if (RegExp(r'^\d+(?:\.\d+)?\s*KG$', caseSensitive: false).hasMatch(w)) {
      return w.replaceAll(' ', '').toUpperCase();
    }
    final match = RegExp(r'(\d+(?:\.\d+)?\s*KG)', caseSensitive: false).firstMatch(w);
    if (match != null) return match.group(1)!.replaceAll(' ', '').toUpperCase();
    var cleaned = w
        .replaceAll(RegExp(r'^(LPG|GAS)\s+', caseSensitive: false), '')
        .replaceAll(RegExp(r'\s+(GAS\s+CYLINDER|CYLINDER)$', caseSensitive: false), '')
        .trim();
    return cleaned.isNotEmpty ? cleaned : w;
  }

  Widget _buildOrderCard(BuildContext context, AppState state, DeliveryOrder order) {
    final isCash = order.paymentMethod.toLowerCase() == 'cash';
    final isCredit = order.paymentMethod.toLowerCase() == 'credit';
    final isEmptyOnly = order.totalCylinders == 0 && order.totalEmpties > 0;
    final initial = order.customer.name.trim().isNotEmpty
        ? order.customer.name.trim().substring(0, 1).toUpperCase()
        : 'C';

    final deliveredItems = order.items.where((it) => it.deliveryQty > 0).toList();
    final returnItems = order.items.where((it) => it.emptyReturnQty > 0).toList();
    final hasEmpties = order.totalEmpties > 0;
    final isExpanded = _expandedOrders.contains(order.ticketId);

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isExpanded ? const Color(0xFFCBD5E1) : const Color(0xFFE2E8F0),
          width: 1.0,
        ),
        boxShadow: isExpanded
            ? const [
                BoxShadow(
                  color: Color(0x0C0F172A),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ]
            : const [
                BoxShadow(
                  color: Color(0x060F172A),
                  blurRadius: 8,
                  offset: Offset(0, 2),
                ),
              ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ---- Main card content (Tappable to expand/collapse) ----
          InkWell(
            onTap: () {
              HapticFeedback.selectionClick();
              setState(() {
                if (isExpanded) {
                  _expandedOrders.remove(order.ticketId);
                } else {
                  _expandedOrders.add(order.ticketId);
                }
              });
            },
            borderRadius: BorderRadius.circular(14),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Avatar circle
                  Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFCE7EC), width: 0.8),
                    ),
                    child: Center(
                      child: Text(
                        initial,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF800020),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),

                  // Customer Details
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          order.customer.name,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text.rich(
                          TextSpan(
                            children: [
                              TextSpan(
                                text: order.ticketId,
                                style: GoogleFonts.jetBrainsMono(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              TextSpan(
                                text: ' • ${order.time}',
                                style: GoogleFonts.inter(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(width: 6),

                  // Total Amount & Payment Badge
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        (order.amount > 0 || !isEmptyOnly) ? '₹${order.amount.toStringAsFixed(0)}' : '₹0',
                        style: GoogleFonts.inter(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w900,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 2.5),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: isEmptyOnly
                              ? const Color(0xFFF1F5F9)
                              : (isCredit
                                  ? const Color(0xFFFEF3C7)
                                  : (isCash ? const Color(0xFFFDF2F4) : const Color(0xFFF1F5F9))),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: isEmptyOnly
                                ? const Color(0xFFE2E8F0)
                                : (isCredit
                                    ? const Color(0xFFFDE68A)
                                    : (isCash ? const Color(0xFFFCE7EC) : const Color(0xFFE2E8F0))),
                          ),
                        ),
                        child: Text(
                          order.totalCylinders == 0 && order.totalEmpties == 0
                              ? (isCash ? 'CASH RECEIPT' : (isCredit ? 'CREDIT' : 'UPI RECEIPT'))
                              : (isEmptyOnly
                                  ? 'EMPTY RETURN'
                                  : (isCredit ? 'CREDIT' : (isCash ? 'CASH' : 'UPI / BANK'))),
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            color: isEmptyOnly
                                ? const Color(0xFF475569)
                                : (isCredit
                                    ? const Color(0xFF92400E)
                                    : (isCash ? const Color(0xFF800020) : const Color(0xFF334155))),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(width: 6),

                  // Quick Edit Button directly on each row
                  InkWell(
                    onTap: () => _showEditOrderModal(context, state, order),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      height: 32,
                      padding: const EdgeInsets.symmetric(horizontal: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDF2F4),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFF5C2CB), width: 1),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.edit_outlined, size: 14, color: Color(0xFF800020)),
                          const SizedBox(width: 4),
                          Text(
                            'Edit',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF800020),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(width: 6),

                  // Big Arrow at right end of the line
                  AnimatedRotation(
                    turns: isExpanded ? 0.5 : 0.0,
                    duration: const Duration(milliseconds: 260),
                    curve: Curves.fastOutSlowIn,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isExpanded ? const Color(0xFFFDF2F4) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: isExpanded ? const Color(0xFFF5C2CB) : const Color(0xFFE2E8F0),
                          width: 1,
                        ),
                      ),
                      child: Center(
                        child: Icon(
                          Icons.keyboard_arrow_down_rounded,
                          size: 24,
                          color: isExpanded ? const Color(0xFF800020) : const Color(0xFF64748B),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // ---- Expanded Drawer: Products Breakdown + Actions Row ----
          AnimatedSize(
            duration: const Duration(milliseconds: 280),
            curve: Curves.fastOutSlowIn,
            alignment: Alignment.topCenter,
            clipBehavior: Clip.antiAlias,
            child: isExpanded
                ? Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
              decoration: BoxDecoration(
                color: const Color(0xFFFAF9FB),
                border: Border(
                  top: BorderSide(color: const Color(0xFFE2E8F0).withValues(alpha: 0.8)),
                ),
                borderRadius: const BorderRadius.vertical(bottom: Radius.circular(14)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Cylinder Details Summary Badges (Shown only inside the dropdown)
                  if (order.totalCylinders == 0 && !hasEmpties) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(color: const Color(0xFFDCFCE7)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.receipt_long_rounded, size: 12.5, color: Color(0xFF16A34A)),
                          const SizedBox(width: 5),
                          Text(
                            'Payment Collection • ₹${order.amount.toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF15803D),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 10),
                  ],

                  if (order.totalCylinders > 0 || hasEmpties) ...[
                    Row(
                      children: [
                        if (order.totalCylinders > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFDF2F4),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFFCE7EC)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.propane_tank_rounded, size: 12.5, color: Color(0xFF800020)),
                                const SizedBox(width: 5),
                                Text(
                                  '${order.totalCylinders} Delivered',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF800020),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        if (hasEmpties) ...[
                          if (order.totalCylinders > 0) const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.autorenew_rounded, size: 12.5, color: Color(0xFF64748B)),
                                const SizedBox(width: 5),
                                Text(
                                  '${order.totalEmpties} Return',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF475569),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 10),
                  ],
                  if (deliveredItems.isNotEmpty) ...[
                    Text(
                      'DELIVERED CYLINDERS',
                      style: GoogleFonts.inter(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    ...deliveredItems.map((it) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: const Color(0xFFFDF2F4),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Center(
                              child: Icon(Icons.propane_tank_rounded, size: 12, color: Color(0xFF800020)),
                            ),
                          ),
                          const SizedBox(width: 7),
                          Text(
                            '${it.deliveryQty}×',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF800020),
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _shortName(it.cylinder.weight),
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '₹${(it.deliveryQty * it.cylinder.price).toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    )),
                  ],

                  if (returnItems.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      'EMPTY RETURNS',
                      style: GoogleFonts.inter(
                        fontSize: 9.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF94A3B8),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 4),
                    ...returnItems.map((it) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        children: [
                          Container(
                            width: 22,
                            height: 22,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(5),
                            ),
                            child: const Center(
                              child: Icon(Icons.autorenew_rounded, size: 12, color: Color(0xFF64748B)),
                            ),
                          ),
                          const SizedBox(width: 7),
                          Text(
                            '${it.emptyReturnQty}×',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF475569),
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            _shortName(it.cylinder.weight),
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
                    )),
                  ],

                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 10),

                  // ---- ACTION BUTTONS ROW INSIDE COLLAPSIBLE DRAWER ----
                  Row(
                    children: [
                      // WhatsApp Share Button
                      Expanded(
                        child: InkWell(
                          onTap: () {
                            String phone = order.customer.phone.trim();
                            if (phone.isEmpty) {
                              try {
                                final matched = state.customers.firstWhere(
                                  (c) => (order.customer.ledgerId != null && c.ledgerId == order.customer.ledgerId) ||
                                         (c.name.trim().toLowerCase() == order.customer.name.trim().toLowerCase()),
                                );
                                phone = matched.phone.trim();
                              } catch (_) {}
                            }
                            final customMsg = InvoiceHelper.formatWhatsAppDeliveryMessage(
                              customerName: order.customer.name,
                              ticketId: order.ticketId,
                              totalDelivered: order.totalCylinders,
                              totalEmpties: order.totalEmpties,
                              totalBill: order.totalBillValue,
                              collectedAmount: order.amount,
                              paymentMethod: order.paymentMethod,
                              driverName: state.driverName,
                            );
                            InvoiceHelper.sharePdfToWhatsApp(
                              context: context,
                              ticketId: order.ticketId,
                              customerName: order.customer.name,
                              customerPhone: phone,
                              salesId: order.salesId,
                              customMessage: customMsg,
                            );
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            height: 36,
                            padding: const EdgeInsets.symmetric(horizontal: 8),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFF800020), width: 1.2),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Image.asset(
                                  'assets/images/whatsapp_logo.png',
                                  width: 16,
                                  height: 16,
                                  errorBuilder: (context, error, stackTrace) => const Icon(
                                    Icons.chat_bubble_outline_rounded,
                                    size: 15,
                                    color: Color(0xFF800020),
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  'WhatsApp',
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF800020),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // View PDF Button
                      InkWell(
                        onTap: () async {
                          await InvoiceHelper.openPdf(context, order.ticketId, salesId: order.salesId);
                          if (!context.mounted) return;
                          final s = AppStateProvider.of(context);
                          if (s.orders.isEmpty) {
                            await s.syncFromBackend();
                          }
                        },
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          height: 36,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFCBD5E1), width: 1),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.picture_as_pdf_outlined, size: 15, color: Color(0xFF475569)),
                              const SizedBox(width: 4),
                              Text(
                                'PDF',
                                style: GoogleFonts.inter(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF475569),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(width: 8),
                      // Edit Amount Button
                      InkWell(
                        onTap: () => _showEditOrderModal(context, state, order),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          height: 36,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFCBD5E1), width: 1),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.edit_outlined, size: 15, color: Color(0xFF475569)),
                              const SizedBox(width: 4),
                              Text(
                                'Edit',
                                style: GoogleFonts.inter(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF475569),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Delete Button
                      InkWell(
                        onTap: () => _showDeleteOrderModal(context, state, order),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          height: 36,
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFFCA5A5), width: 1),
                          ),
                          child: const Center(
                            child: Icon(Icons.delete_outline_rounded, size: 16, color: Color(0xFF800020)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            )
          : const SizedBox(width: double.infinity, height: 0),
          ),
        ],
      ),
    );
  }

  // ================= 4. REDESIGNED EDIT POPUP WINDOW (MATCHING ADD DELIVERY SCREEN) =================
  void _showEditOrderModal(BuildContext context, AppState state, DeliveryOrder order) {
    // Clone items or match with active state cylinders
    final Map<int, DeliveryItem> editedItemsMap = {};

    // 1. Populate from order.items
    for (final it in order.items) {
      final pId = it.cylinder.productId ?? 0;
      editedItemsMap[pId] = DeliveryItem(
        cylinder: it.cylinder,
        deliveryQty: it.deliveryQty,
        emptyReturnQty: it.emptyReturnQty,
      );
    }

    // 2. Also ensure all cylinders currently loaded in van are accessible for editing
    for (final cyl in state.cylinders) {
      final pId = cyl.productId ?? 0;
      if (!editedItemsMap.containsKey(pId)) {
        editedItemsMap[pId] = DeliveryItem(
          cylinder: cyl,
          deliveryQty: 0,
          emptyReturnQty: 0,
        );
      }
    }

    final itemsList = editedItemsMap.values.toList();

    // Helper to calculate auto-amount
    double calcTotal() {
      return itemsList.fold(0.0, (sum, it) => sum + (it.deliveryQty * it.cylinder.price));
    }

    final initialMethod = order.paymentMethod.isNotEmpty ? order.paymentMethod : 'Cash';
    String selectedMethod = 'Cash';
    final mLow = initialMethod.toLowerCase();
    if (mLow == 'upi' || mLow == 'bank' || mLow == 'digital') {
      selectedMethod = 'UPI';
    } else if (mLow == 'split') {
      selectedMethod = 'Split';
    } else {
      selectedMethod = 'Cash';
    }

    final amountController = TextEditingController(text: order.amount.toStringAsFixed(0));
    final splitCashController = TextEditingController(
      text: (order.cashAmount ?? 0) > 0 ? (order.cashAmount ?? 0).toStringAsFixed(0) : '',
    );
    final splitUpiController = TextEditingController(
      text: (order.upiAmount ?? 0) > 0 ? (order.upiAmount ?? 0).toStringAsFixed(0) : '',
    );
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final computedTotal = calcTotal();

          return Container(
            constraints: BoxConstraints(
              maxHeight: MediaQuery.of(ctx).size.height * 0.88,
            ),
            padding: EdgeInsets.fromLTRB(
              20,
              14,
              20,
              MediaQuery.of(ctx).viewInsets.bottom > 0
                  ? (MediaQuery.of(ctx).viewInsets.bottom + 16)
                  : (MediaQuery.of(ctx).padding.bottom + 16),
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Drag Handle
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Title Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Edit Delivery Sale',
                        style: GoogleFonts.inter(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Text(
                          order.ticketId,
                          style: GoogleFonts.jetBrainsMono(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Customer: ${order.customer.name}',
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF64748B),
                    ),
                  ),

                  const SizedBox(height: 16),

                  // UNIFIED CYLINDERS TABLE (EXACTLY MATCHING ADD DELIVERY SCREEN)
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Section Header
                        Row(
                          children: [
                            const Icon(Icons.propane_tank_rounded, size: 16, color: Color(0xFF800020)),
                            const SizedBox(width: 6),
                            Text(
                              'CYLINDERS TO DELIVER',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF800020),
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),

                        // Table Column Headers: Weight | Filled | Empty Return
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                flex: 3,
                                child: Text(
                                  'Weight',
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 4,
                                child: Text(
                                  'Filled',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF800020),
                                  ),
                                ),
                              ),
                              Expanded(
                                flex: 4,
                                child: Text(
                                  'Empty Return',
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 6),

                        // Cylinder Table Rows with Stepper Pills
                        ...List.generate(itemsList.length, (i) {
                          final it = itemsList[i];
                          final cyl = it.cylinder;
                          return Container(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                            decoration: BoxDecoration(
                              border: i < itemsList.length - 1
                                  ? const Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1))
                                  : null,
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Weight Column
                                Expanded(
                                  flex: 3,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                                        decoration: BoxDecoration(
                                          color: const Color(0xFFF8FAFC),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: const Color(0xFFE2E8F0),
                                            width: 1,
                                          ),
                                        ),
                                        child: Text(
                                          _shortName(cyl.weight),
                                          style: GoogleFonts.inter(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w800,
                                            color: const Color(0xFF0F172A),
                                          ),
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Padding(
                                        padding: const EdgeInsets.only(left: 2),
                                        child: Text(
                                          '₹${cyl.price.toStringAsFixed(0)}',
                                          style: GoogleFonts.inter(
                                            fontSize: 10.5,
                                            fontWeight: FontWeight.w600,
                                            color: const Color(0xFF64748B),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                // Filled Stepper Pill [- QTY +]
                                Expanded(
                                  flex: 4,
                                  child: Center(
                                    child: _buildStepperPill(
                                      qty: it.deliveryQty,
                                      canDecrease: it.deliveryQty > 0,
                                      canIncrease: true,
                                      activeColor: const Color(0xFF800020),
                                      onDecrease: () {
                                        if (it.deliveryQty > 0) {
                                          setModalState(() {
                                            it.deliveryQty--;
                                            amountController.text = calcTotal().toStringAsFixed(0);
                                          });
                                        }
                                      },
                                      onIncrease: () {
                                        setModalState(() {
                                          it.deliveryQty++;
                                          amountController.text = calcTotal().toStringAsFixed(0);
                                        });
                                      },
                                    ),
                                  ),
                                ),

                                // Empty Return Stepper Pill [- QTY +]
                                Expanded(
                                  flex: 4,
                                  child: Center(
                                    child: _buildStepperPill(
                                      qty: it.emptyReturnQty,
                                      canDecrease: it.emptyReturnQty > 0,
                                      canIncrease: true,
                                      activeColor: const Color(0xFF0F172A),
                                      onDecrease: () {
                                        if (it.emptyReturnQty > 0) {
                                          setModalState(() {
                                            it.emptyReturnQty--;
                                          });
                                        }
                                      },
                                      onIncrease: () {
                                        setModalState(() {
                                          it.emptyReturnQty++;
                                        });
                                      },
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // Collected Amount Card
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'COLLECTED AMOUNT',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF64748B),
                                letterSpacing: 0.5,
                              ),
                            ),
                            if (computedTotal > 0)
                              InkWell(
                                onTap: () {
                                  setModalState(() {
                                    amountController.text = computedTotal.toStringAsFixed(0);
                                  });
                                },
                                borderRadius: BorderRadius.circular(6),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF2F2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    'Auto: ₹${computedTotal.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF800020),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        TextField(
                          controller: amountController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          cursorColor: const Color(0xFF800020),
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                          decoration: InputDecoration(
                            prefixText: '₹ ',
                            prefixStyle: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF800020),
                            ),
                            filled: true,
                            fillColor: const Color(0xFFF8FAFC),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5),
                            ),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Payment method selector: Cash, UPI, Split, Credit
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'PAYMENT METHOD',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF64748B),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: ['Cash', 'UPI', 'Split', 'Credit'].map((m) {
                            final isSel = selectedMethod.toLowerCase() == m.toLowerCase();
                            final label = m == 'UPI' ? 'UPI' : m;
                            return Expanded(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 2.0),
                                child: InkWell(
                                  onTap: () {
                                    setModalState(() {
                                      selectedMethod = m;
                                      if (m == 'Split') {
                                        final half = (computedTotal / 2).roundToDouble();
                                        if (splitCashController.text.isEmpty) {
                                          splitCashController.text = half.toStringAsFixed(0);
                                        }
                                        if (splitUpiController.text.isEmpty) {
                                          splitUpiController.text = (computedTotal - half).toStringAsFixed(0);
                                        }
                                        amountController.text = computedTotal.toStringAsFixed(0);
                                      } else if (m == 'Credit') {
                                        amountController.text = '0';
                                        splitCashController.clear();
                                        splitUpiController.clear();
                                      } else {
                                        if (amountController.text == '0' || amountController.text.isEmpty) {
                                          amountController.text = computedTotal.toStringAsFixed(0);
                                        }
                                      }
                                    });
                                  },
                                  borderRadius: BorderRadius.circular(9),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isSel ? const Color(0xFF800020) : const Color(0xFFF8FAFC),
                                      borderRadius: BorderRadius.circular(9),
                                      border: Border.all(
                                        color: isSel ? const Color(0xFF800020) : const Color(0xFFCBD5E1),
                                        width: isSel ? 1.4 : 1.0,
                                      ),
                                    ),
                                    child: Center(
                                      child: Text(
                                        label,
                                        style: GoogleFonts.inter(
                                          fontSize: 12.0,
                                          fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                                          color: isSel ? Colors.white : const Color(0xFF475569),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            );
                          }).toList(),
                        ),

                        // Split Payment Inputs
                        if (selectedMethod.toLowerCase() == 'split') ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('Cash (₹)', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF475569))),
                                          const SizedBox(height: 4),
                                          TextField(
                                            controller: splitCashController,
                                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                                            decoration: InputDecoration(
                                              isDense: true,
                                              filled: true,
                                              fillColor: Colors.white,
                                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                            ),
                                            onChanged: (val) {
                                              final c = double.tryParse(val) ?? 0;
                                              final u = (computedTotal - c).clamp(0, computedTotal);
                                              splitUpiController.text = u.toStringAsFixed(0);
                                              setModalState(() {
                                                amountController.text = (c + u).toStringAsFixed(0);
                                              });
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text('UPI / Bank (₹)', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF800020))),
                                          const SizedBox(height: 4),
                                          TextField(
                                            controller: splitUpiController,
                                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF800020)),
                                            decoration: InputDecoration(
                                              isDense: true,
                                              filled: true,
                                              fillColor: Colors.white,
                                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF800020))),
                                            ),
                                            onChanged: (val) {
                                              final u = double.tryParse(val) ?? 0;
                                              final c = double.tryParse(splitCashController.text) ?? 0;
                                              setModalState(() {
                                                amountController.text = (c + u).toStringAsFixed(0);
                                              });
                                            },
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // Save & Cancel Actions
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: isSaving ? null : () => Navigator.pop(ctx),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            side: const BorderSide(color: Color(0xFFCBD5E1)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: Text(
                            'Cancel',
                            style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        flex: 2,
                        child: ElevatedButton(
                          onPressed: isSaving
                              ? null
                              : () async {
                                  final activeDeliveryItems = itemsList.where((it) => it.deliveryQty > 0 || it.emptyReturnQty > 0).toList();
                                  final isPureReceipt = order.items.isEmpty || order.ticketId.startsWith('RCPT-') || order.ticketId.startsWith('TREC-');
                                  if (!isPureReceipt && activeDeliveryItems.isEmpty) {
                                    AppToast.warning(context, 'At least 1 cylinder must be delivered or returned.');
                                    return;
                                  }

                                  double parsedAmt = 0;
                                  double? cashAmt;
                                  double? upiAmt;

                                  if (selectedMethod.toLowerCase() == 'credit') {
                                    parsedAmt = 0;
                                    cashAmt = 0;
                                    upiAmt = 0;
                                  } else if (selectedMethod.toLowerCase() == 'split') {
                                    cashAmt = double.tryParse(splitCashController.text.trim()) ?? 0;
                                    upiAmt = double.tryParse(splitUpiController.text.trim()) ?? 0;
                                    parsedAmt = cashAmt + upiAmt;
                                  } else if (selectedMethod.toLowerCase() == 'cash') {
                                    parsedAmt = double.tryParse(amountController.text.trim()) ?? computedTotal;
                                    cashAmt = parsedAmt;
                                    upiAmt = 0;
                                  } else {
                                    parsedAmt = double.tryParse(amountController.text.trim()) ?? computedTotal;
                                    cashAmt = 0;
                                    upiAmt = parsedAmt;
                                  }

                                  setModalState(() => isSaving = true);

                                  final ok = await state.updateOrderWithItems(
                                    ticketId: order.ticketId,
                                    newAmount: parsedAmt,
                                    newPaymentMethod: selectedMethod,
                                    updatedItems: activeDeliveryItems,
                                    cashAmount: cashAmt,
                                    upiAmount: upiAmt,
                                  );
                                  await InvoiceHelper.invalidateCachedPdf(order.ticketId);

                                  if (ctx.mounted) Navigator.pop(ctx);
                                  if (context.mounted) {
                                    if (ok) {
                                      AppToast.success(context, 'Sale updated & PDF regenerated: ₹${parsedAmt.toStringAsFixed(0)} ($selectedMethod)');
                                    } else {
                                      AppToast.error(context, 'Failed to update sale on server');
                                    }
                                  }
                                },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF800020),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          child: isSaving
                              ? const Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)),
                                    SizedBox(width: 8),
                                    Text('Updating & Syncing...', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
                                  ],
                                )
                              : Text('Save & Regenerate PDF', style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w700)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  // ================= STEPPER PILL (MATCHING ADD DELIVERY SCREEN) =================
  Widget _buildStepperPill({
    required int qty,
    required bool canDecrease,
    required bool canIncrease,
    required Color activeColor,
    required VoidCallback onDecrease,
    required VoidCallback onIncrease,
  }) {
    final isSelected = qty > 0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? Colors.white : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isSelected ? activeColor : const Color(0xFFCBD5E1),
          width: isSelected ? 1.5 : 1.2,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: activeColor.withValues(alpha: 0.12),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Minus button
          InkWell(
            onTap: canDecrease ? onDecrease : null,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              child: Icon(
                Icons.remove_rounded,
                size: 16,
                color: canDecrease ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
              ),
            ),
          ),

          // Count Text
          Container(
            width: 26,
            alignment: Alignment.center,
            child: Text(
              '$qty',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: isSelected ? activeColor : const Color(0xFF64748B),
              ),
            ),
          ),

          // Plus button
          InkWell(
            onTap: canIncrease ? onIncrease : null,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              width: 28,
              height: 28,
              alignment: Alignment.center,
              child: Icon(
                Icons.add_rounded,
                size: 16,
                color: canIncrease ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ================= DELETE CONFIRMATION MODAL =================
  void _showDeleteOrderModal(BuildContext context, AppState state, DeliveryOrder order) {
    HapticFeedback.mediumImpact();
    bool isDeleting = false;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.fromLTRB(20, 14, 20, 20 + MediaQuery.of(ctx).padding.bottom),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 36,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              Text(
                'Delete Sale Record?',
                style: GoogleFonts.inter(
                  fontSize: 17,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'This will restore delivered cylinders back to van stock and reverse the accounting voucher.',
                style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
              ),

              const SizedBox(height: 14),

              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        order.customer.name,
                        style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      '₹${order.amount.toStringAsFixed(0)}',
                      style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w900, color: const Color(0xFF0F172A)),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 18),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: isDeleting ? null : () => Navigator.pop(ctx),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: Text('Cancel', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: const Color(0xFF64748B))),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: isDeleting
                          ? null
                          : () async {
                              setModalState(() => isDeleting = true);
                              await state.deleteOrder(order);
                              if (ctx.mounted) Navigator.pop(ctx);
                              if (context.mounted) {
                                AppToast.success(context, 'Sale ${order.ticketId} deleted. Stock restored.');
                              }
                            },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF800020),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        elevation: 0,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: isDeleting
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text('Delete Sale', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ================= EMPTY STATE =================
  Widget _buildEmptyState(BuildContext context, AppState state) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: const BoxDecoration(
              color: Color(0xFFF1F5F9),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.receipt_long_outlined, size: 24, color: Color(0xFF94A3B8)),
          ),
          const SizedBox(height: 12),
          Text(
            _searchQuery.isNotEmpty ? 'No Matching Sales Found' : 'No Sales Recorded Today',
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            _searchQuery.isNotEmpty
                ? 'Try a different customer name or ticket number'
                : 'Delivered orders will show up here in real time',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }
}
