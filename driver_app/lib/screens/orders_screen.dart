import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import 'home_shell.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  int _activeFilterIndex = 0; // 0: All, 1: Cash, 2: UPI
  bool _showSearch = false;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);

    // Totals
    final cashOrders =
        state.orders.where((o) => o.paymentMethod.toLowerCase() == 'cash').toList();
    final upiOrders =
        state.orders.where((o) => o.paymentMethod.toLowerCase().contains('upi')).toList();

    final cashTotal = cashOrders.fold(0.0, (sum, o) => sum + o.amount);
    final upiTotal = upiOrders.fold(0.0, (sum, o) => sum + o.amount);

    // Filtered list
    List<DeliveryOrder> displayOrders;
    if (_activeFilterIndex == 1) {
      displayOrders = cashOrders;
    } else if (_activeFilterIndex == 2) {
      displayOrders = upiOrders;
    } else {
      displayOrders = state.orders;
    }

    if (_searchQuery.isNotEmpty) {
      displayOrders = displayOrders.where((o) {
        final query = _searchQuery.toLowerCase();
        final nameMatches = o.customer.name.toLowerCase().contains(query);
        final shopMatches = o.customer.shopId?.toLowerCase().contains(query) ?? false;
        return nameMatches || shopMatches;
      }).toList();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF1F5F9),
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        centerTitle: false,
        toolbarHeight: 52,
        titleSpacing: 20,
        title: _showSearch
            ? TextField(
                controller: _searchController,
                autofocus: true,
                onChanged: (val) => setState(() => _searchQuery = val),
                decoration: const InputDecoration(
                  hintText: 'Search customer...',
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                  filled: false,
                  contentPadding: EdgeInsets.zero,
                ),
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600),
              )
            : Text(
                'Orders',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
        actions: [
          // Live Sync Pill
          Padding(
            padding: const EdgeInsets.only(right: 4),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4.5),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFBBF7D0)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Color(0xFF16A34A),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    state.lastSyncTime != null
                        ? '${state.lastSyncTime!.hour.toString().padLeft(2, '0')}:${state.lastSyncTime!.minute.toString().padLeft(2, '0')}'
                        : 'Live',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF15803D),
                    ),
                  ),
                ],
              ),
            ),
          ),
          IconButton(
            icon: Icon(
              _showSearch ? Icons.close_rounded : Icons.search_rounded,
              color: const Color(0xFF0F172A),
              size: 22,
            ),
            onPressed: () {
              setState(() {
                if (_showSearch) {
                  _searchController.clear();
                  _searchQuery = '';
                }
                _showSearch = !_showSearch;
              });
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Total Collected Today Summary Card (Matching Home Screen design)
            _buildTotalSummaryCard(state, cashTotal, upiTotal),

            const SizedBox(height: 12),

            // 2. Brand Theme Filter Pills (All, Cash, UPI)
            _buildFilterChips(state.orders.length, cashOrders.length, upiOrders.length),

            const SizedBox(height: 12),

            // 3. Orders List
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

            const SizedBox(height: 90),
          ],
        ),
      ),
    );
  }

  // ================= 1. TOTAL COLLECTED TODAY SUMMARY CARD =================
  Widget _buildTotalSummaryCard(AppState state, double cashTotal, double upiTotal) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0E0F172A),
            blurRadius: 16,
            offset: Offset(0, 4),
          ),
          BoxShadow(
            color: Color(0x080F172A),
            blurRadius: 4,
            offset: Offset(0, 1),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row
            Row(
              children: [
                const Icon(Icons.payments_rounded, size: 16, color: Color(0xFF16A34A)),
                const SizedBox(width: 6),
                Text(
                  'TOTAL COLLECTED TODAY',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF15803D),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),

            // Hero Total Amount
            Text(
              '\u20B9${state.todayCollectedTotal.toStringAsFixed(0)}',
              style: GoogleFonts.inter(
                fontSize: 24,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF15803D),
                letterSpacing: -0.4,
              ),
            ),

            const SizedBox(height: 10),

            // Cash & UPI Breakdown Boxes
            Row(
              children: [
                // Cash Box
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.money_rounded, size: 12, color: Color(0xFF16A34A)),
                            const SizedBox(width: 4),
                            Text(
                              'CASH',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '\u20B9${cashTotal.toStringAsFixed(0)}',
                          style: GoogleFonts.inter(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),

                // UPI Box
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8.5),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.qr_code_2_rounded, size: 12, color: Color(0xFF0284C7)),
                            const SizedBox(width: 4),
                            Text(
                              'UPI',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '\u20B9${upiTotal.toStringAsFixed(0)}',
                          style: GoogleFonts.inter(
                            fontSize: 15.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ================= 2. FILTER CHIPS =================
  Widget _buildFilterChips(int allCount, int cashCount, int upiCount) {
    return Row(
      children: [
        _chipItem(0, 'All ($allCount)'),
        const SizedBox(width: 8),
        _chipItem(1, 'Cash ($cashCount)'),
        const SizedBox(width: 8),
        _chipItem(2, 'UPI ($upiCount)'),
      ],
    );
  }

  Widget _chipItem(int index, String label) {
    final isSelected = _activeFilterIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _activeFilterIndex = index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF800020) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF800020) : const Color(0xFFCBD5E1),
            width: 1.2,
          ),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }

  // ================= 3. COMPACT & SLEEK MODERN ORDER CARD =================
  Widget _buildOrderCard(BuildContext context, AppState state, DeliveryOrder order) {
    final isCash = order.paymentMethod.toLowerCase() == 'cash';
    final deliveredItems = order.items.where((i) => i.deliveryQty > 0).toList();
    final returnedItems = order.items.where((i) => i.emptyReturnQty > 0).toList();

    return GestureDetector(
      onLongPress: () => _showDeleteOrderSheet(context, state, order),
      child: Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          boxShadow: const [
            BoxShadow(
              color: Color(0x0D0F172A),
              blurRadius: 12,
              offset: Offset(0, 3),
            ),
            BoxShadow(
              color: Color(0x060F172A),
              blurRadius: 3,
              offset: Offset(0, 1),
            ),
          ],
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Row 1: Left (Customer Name & Time) | Right (Amount & Payment Badge underneath)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Left: Customer Name + Timestamp
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        order.customer.name,
                        style: GoogleFonts.inter(
                          fontSize: 15.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                          letterSpacing: -0.2,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          const Icon(Icons.access_time_rounded, size: 12, color: Color(0xFF64748B)),
                          const SizedBox(width: 4),
                          Text(
                            order.time,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Right: Amount with Payment Badge directly below it
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      '\u20B9${order.amount.toStringAsFixed(0)}',
                      style: GoogleFonts.inter(
                        fontSize: 16.5,
                        fontWeight: FontWeight.w900,
                        color: const Color(0xFF0F172A),
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: isCash ? const Color(0xFFF0FDF4) : const Color(0xFFF0F9FF),
                        borderRadius: BorderRadius.circular(5),
                        border: Border.all(
                          color: isCash ? const Color(0xFFBBF7D0) : const Color(0xFFBAE6FD),
                        ),
                      ),
                      child: Text(
                        order.paymentMethod.toUpperCase(),
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: isCash ? const Color(0xFF15803D) : const Color(0xFF0284C7),
                          letterSpacing: 0.3,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Row 2: Cylinder Delivery & Return Badges (Full width Wrap with crystal-clear visibility)
            // Row 2: Cylinder Delivery & Return Details (Clean text without red background)
            Wrap(
              spacing: 12,
              runSpacing: 4,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                // Delivered Cylinders
                ...deliveredItems.map((item) {
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.propane_tank_rounded, size: 13, color: Color(0xFF800020)),
                      const SizedBox(width: 4),
                      Text(
                        '${item.cylinder.weight} \u00D7 ${item.deliveryQty}',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  );
                }),

                // Empty Returns
                ...returnedItems.map((item) {
                  return Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.refresh_rounded, size: 13, color: Color(0xFF64748B)),
                      const SizedBox(width: 4),
                      Text(
                        '${item.cylinder.weight} \u00D7 ${item.emptyReturnQty} Empty',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  );
                }),
              ],
            ),
            ],
          ),
        ),
      );
  }

  void _showDeleteOrderSheet(BuildContext context, AppState state, DeliveryOrder order) {
    HapticFeedback.mediumImpact();
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: EdgeInsets.fromLTRB(20, 16, 20, 20 + MediaQuery.of(ctx).padding.bottom),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Color(0x20000000),
              blurRadius: 20,
              offset: Offset(0, -4),
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Center drag handle
            Center(
              child: Container(
                width: 38,
                height: 4,
                decoration: BoxDecoration(
                  color: const Color(0xFFCBD5E1),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Header Title (Clean without big icon or ticket ID subtitle)
            Text(
              'Delete Order?',
              style: GoogleFonts.inter(
                fontSize: 18,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF0F172A),
              ),
            ),

            const SizedBox(height: 14),

            // Order Detail Summary Box
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
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
                      Text(
                        order.customer.name,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        '\u20B9${order.amount.toStringAsFixed(0)}',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  if (order.cylinderSummary.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      'Delivered: ${order.cylinderSummary}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 14),

            Text(
              'Deleting this order will remove it from total collections and restore the delivered cylinders back to vehicle stock.',
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF64748B),
                height: 1.4,
              ),
            ),

            const SizedBox(height: 20),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF475569),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      state.deleteOrder(order);
                      Navigator.pop(ctx);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Order deleted & stock restored'),
                          backgroundColor: const Color(0xFF0F172A),
                          behavior: SnackBarBehavior.floating,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF800020),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.delete_rounded, size: 18),
                        const SizedBox(width: 6),
                        Text(
                          'Delete Order',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ================= 4. EMPTY STATE =================
  Widget _buildEmptyState(BuildContext context, AppState state) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 54,
              height: 54,
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Icon(Icons.receipt_long_outlined, size: 26, color: Color(0xFF94A3B8)),
            ),
            const SizedBox(height: 12),
            Text(
              'No Deliveries Logged Yet',
              style: GoogleFonts.inter(
                fontSize: 15,
                fontWeight: FontWeight.w800,
                color: const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Start recording customer drops to see today\'s orders here.',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: const Color(0xFF64748B),
                fontWeight: FontWeight.w500,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () {
                state.resetDelivery();
                HomeShell.switchTab(context, 1);
              },
              icon: const Icon(Icons.add_rounded, size: 16),
              label: Text(
                'NEW DELIVERY',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF800020),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
