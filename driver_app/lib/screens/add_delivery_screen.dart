import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import 'success_screen.dart';

class AddDeliveryScreen extends StatefulWidget {
  const AddDeliveryScreen({super.key});

  @override
  State<AddDeliveryScreen> createState() => _AddDeliveryScreenState();
}

class _AddDeliveryScreenState extends State<AddDeliveryScreen> {
  final _amountController = TextEditingController();
  final _searchController = TextEditingController();
  String _searchQuery = '';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _submitDelivery(AppState state) async {
    final enteredAmount = double.tryParse(_amountController.text.replaceAll(',', '').trim()) ?? 0;
    if (enteredAmount > 0) {
      state.setCollectedAmount(enteredAmount);
    } else if (state.collectedAmount == 0 && state.totalBillAmount > 0) {
      state.setCollectedAmount(state.totalBillAmount);
    }
    setState(() => _isSubmitting = true);
    await Future.delayed(const Duration(milliseconds: 300));
    if (!mounted) return;
    state.completeDelivery();
    setState(() => _isSubmitting = false);
    if (!mounted) return;
    SuccessScreen.show(context);
  }

  void _selectOrAddCustomCustomer(AppState state, String name) {
    final trimmed = name.trim();
    if (trimmed.isEmpty) return;

    // Check if matching customer exists in state
    final existing = state.customers.where(
      (c) => c.name.toLowerCase() == trimmed.toLowerCase(),
    );

    if (existing.isNotEmpty) {
      state.selectCustomer(existing.first);
    } else {
      // Create and select ad-hoc customer with clean fields
      final newCustomer = Customer(
        name: trimmed,
        phone: '',
        address: '',
        type: 'Regular',
      );
      state.selectCustomer(newCustomer);
    }

    setState(() {
      _searchQuery = '';
      _searchController.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);

    final enteredAmount = double.tryParse(_amountController.text.replaceAll(',', '').trim()) ?? 0;
    final effectiveAmount = enteredAmount > 0
        ? enteredAmount
        : (state.collectedAmount > 0 ? state.collectedAmount : state.totalBillAmount);
    final hasValidAmount = effectiveAmount > 0;

    final canSubmit = state.selectedCustomer != null &&
        state.totalCylinders > 0 &&
        state.paymentMethod.isNotEmpty &&
        hasValidAmount;

    // Calculate completion progress (1: Customer, 2: Cylinders, 3: Payment & Amount)
    int completedStepCount = 0;
    if (state.selectedCustomer != null) completedStepCount++;
    if (state.totalCylinders > 0) completedStepCount++;
    if (state.paymentMethod.isNotEmpty && hasValidAmount) completedStepCount++;
    final double completionProgress = completedStepCount / 3.0;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF1F5F9),
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleSpacing: 20,
        toolbarHeight: 76,
        automaticallyImplyLeading: false,
        title: Padding(
          padding: const EdgeInsets.only(right: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'Add Delivery',
                style: GoogleFonts.inter(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(height: 6),
              TweenAnimationBuilder<double>(
                duration: const Duration(milliseconds: 450),
                curve: Curves.easeOutCubic,
                tween: Tween<double>(begin: 0.0, end: completionProgress),
                builder: (context, animatedProgress, child) {
                  final isDone = animatedProgress >= 0.99;
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            isDone ? 'Ready to Submit' : 'Order Completion',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isDone
                                  ? const Color(0xFFDC2626)
                                  : const Color(0xFF64748B),
                            ),
                          ),
                          Text(
                            '$completedStepCount of 3 steps',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: isDone ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: animatedProgress,
                          backgroundColor: const Color(0xFFE2E8F0),
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            Color(0xFFDC2626),
                          ),
                          minHeight: 4,
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Customer Section
            _buildCustomerCardOrSelector(state),

            const SizedBox(height: 14),

            // 2. Unified Cylinder to Deliver & Return Empty Section (Single Table)
            _buildUnifiedCylinderTableCard(state),

            const SizedBox(height: 14),

            // 3. Payment Method Section
            _buildPaymentMethodSection(state),

            const SizedBox(height: 14),

            // 4. Redesigned Bill Amount Collection Card
            _buildRedesignedBillAmountCard(state),

            const SizedBox(height: 18),

            // 5. Inline Submit Button (directly under Bill Amount)
            _buildInlineSubmitButton(context, state, canSubmit, hasValidAmount),

            const SizedBox(height: 100), // Clearance for floating pill bottom nav
          ],
        ),
      ),
    );
  }

  // ================= 1. CUSTOMER SELECTOR / CARD =================
  Widget _buildCustomerCardOrSelector(AppState state) {
    final c = state.selectedCustomer;

    final trimmedQuery = _searchQuery.trim();
    final showSearchResults = trimmedQuery.isNotEmpty;

    // Customer Search Filter
    final filtered = state.customers.where((item) {
      if (trimmedQuery.isEmpty) return false;
      final q = trimmedQuery.toLowerCase();
      return item.name.toLowerCase().contains(q) || item.phone.contains(q);
    }).toList();

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
            // Section Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.person_rounded, size: 16, color: Color(0xFF0F172A)),
                    const SizedBox(width: 6),
                    Text(
                      'CUSTOMER',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                if (c != null)
                  InkWell(
                    onTap: () {
                      state.selectedCustomer = null;
                      _searchController.clear();
                      setState(() => _searchQuery = '');
                    },
                    borderRadius: BorderRadius.circular(6),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Text(
                        'Change',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),

            // If customer is selected
            if (c != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFEE2E2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.person_rounded,
                        size: 20,
                        color: Color(0xFFDC2626),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        c.name,
                        style: GoogleFonts.inter(
                          fontSize: 14.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              )
            else ...[
              // Clean blended search input directly inside card (no nested pill box or outline)
              Row(
                children: [
                  const Icon(Icons.search_rounded, size: 20, color: Color(0xFF64748B)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      controller: _searchController,
                      onChanged: (v) => setState(() => _searchQuery = v),
                      onSubmitted: (v) {
                        _selectOrAddCustomCustomer(state, v);
                      },
                      decoration: InputDecoration(
                        hintText: 'Search customer...',
                        hintStyle: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF94A3B8),
                        ),
                        border: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        errorBorder: InputBorder.none,
                        disabledBorder: InputBorder.none,
                        isDense: true,
                        contentPadding: const EdgeInsets.symmetric(vertical: 6),
                      ),
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  if (_searchQuery.isNotEmpty)
                    GestureDetector(
                      onTap: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                      child: const Padding(
                        padding: EdgeInsets.symmetric(horizontal: 6),
                        child: Icon(Icons.close_rounded, size: 18, color: Color(0xFF64748B)),
                      ),
                    ),
                ],
              ),

              if (showSearchResults) ...[
                const SizedBox(height: 8),

                // If user typed a query that is not exact match, offer instant "Use '[name]' as customer"
                if (!state.customers.any((c) => c.name.toLowerCase() == trimmedQuery.toLowerCase())) ...[
                  InkWell(
                    onTap: () => _selectOrAddCustomCustomer(state, trimmedQuery),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 9),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFFEE2E2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.add_circle_outline_rounded, size: 17, color: Color(0xFFDC2626)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Use "$trimmedQuery" as Customer',
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFDC2626),
                              ),
                            ),
                          ),
                          const Icon(Icons.arrow_forward_rounded, size: 15, color: Color(0xFFDC2626)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                ],

                if (filtered.isNotEmpty)
                  Container(
                    constraints: const BoxConstraints(maxHeight: 200),
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: filtered.length,
                      separatorBuilder: (_, _) => const Divider(
                        height: 1,
                        color: Color(0xFFF1F5F9),
                      ),
                      itemBuilder: (context, index) {
                        final cust = filtered[index];
                        return InkWell(
                          onTap: () {
                            state.selectCustomer(cust);
                            setState(() {
                              _searchQuery = '';
                              _searchController.clear();
                            });
                          },
                          borderRadius: BorderRadius.circular(8),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Center(
                                    child: Text(
                                      cust.name.isNotEmpty ? cust.name.substring(0, 1) : 'C',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        cust.name,
                                        style: GoogleFonts.inter(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFF0F172A),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      const SizedBox(height: 1),
                                      Text(
                                        cust.address.isNotEmpty
                                            ? '${cust.phone} • ${cust.address}'
                                            : cust.phone,
                                        style: GoogleFonts.inter(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w500,
                                          color: const Color(0xFF64748B),
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(
                                  Icons.chevron_right_rounded,
                                  size: 16,
                                  color: Color(0xFF94A3B8),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  // ================= 2. UNIFIED CYLINDERS TABLE (FILLED & EMPTY SIDE-BY-SIDE) =================
  Widget _buildUnifiedCylinderTableCard(AppState state) {
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
            // Section Header
            Row(
              children: [
                const Icon(Icons.propane_tank_rounded, size: 18, color: Color(0xFFDC2626)),
                const SizedBox(width: 6),
                Text(
                  'CYLINDERS TO DELIVER',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFFDC2626),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Table Column Headers: Weight (KG) | Filled | Empty
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
                        fontSize: 12,
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
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFFDC2626),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: Text(
                      'Empty Return',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),

            // Table Rows
            ...List.generate(state.deliveryItems.length, (index) {
              final item = state.deliveryItems[index];
              final cyl = item.cylinder;
              final filledQty = item.deliveryQty;
              final emptyQty = item.emptyReturnQty;
              final hasStock = cyl.filledStock > 0;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        // Weight Badge Column (Bright vivid high-contrast badge)
                        Expanded(
                          flex: 3,
                          child: Align(
                            alignment: Alignment.centerLeft,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: hasStock ? const Color(0xFFFEF2F2) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: hasStock ? const Color(0xFFF87171) : const Color(0xFFCBD5E1),
                                  width: 1.3,
                                ),
                              ),
                              child: Text(
                                cyl.weight,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: hasStock ? const Color(0xFF991B1B) : const Color(0xFF0F172A),
                                ),
                              ),
                            ),
                          ),
                        ),

                        // Filled Delivery Stepper Pill [- QTY +]
                        Expanded(
                          flex: 4,
                          child: Center(
                            child: _buildStepperPill(
                              qty: filledQty,
                              canDecrease: filledQty > 0,
                              canIncrease: filledQty < cyl.filledStock,
                              activeColor: const Color(0xFFDC2626),
                              onDecrease: () {
                                state.updateDeliveryQty(index, filledQty - 1);
                                setState(() {});
                              },
                              onIncrease: () {
                                state.updateDeliveryQty(index, filledQty + 1);
                                setState(() {});
                              },
                            ),
                          ),
                        ),

                        // Empty Return Stepper Pill [- QTY +]
                        Expanded(
                          flex: 4,
                          child: Center(
                            child: _buildStepperPill(
                              qty: emptyQty,
                              canDecrease: emptyQty > 0,
                              canIncrease: true,
                              activeColor: const Color(0xFF0F172A),
                              onDecrease: () {
                                state.updateEmptyReturnQty(index, emptyQty - 1);
                                setState(() {});
                              },
                              onIncrease: () {
                                state.updateEmptyReturnQty(index, emptyQty + 1);
                                setState(() {});
                              },
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Padding(
                      padding: const EdgeInsets.only(left: 2),
                      child: Text(
                        hasStock ? '${cyl.filledStock} left' : '0 left',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: hasStock ? FontWeight.w800 : FontWeight.w600,
                          color: hasStock ? const Color(0xFFDC2626) : const Color(0xFF64748B),
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
    );
  }

  // Stepper Pill Widget matching user screenshot: [-  0  +]
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

  // ================= 3. PAYMENT METHOD SECTION =================
  Widget _buildPaymentMethodSection(AppState state) {
    final methods = [
      {'key': 'Cash', 'title': 'Cash', 'icon': Icons.payments_outlined},
      {'key': 'UPI', 'title': 'UPI / QR', 'icon': Icons.qr_code_2_rounded},
    ];

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
            // Section Header
            Row(
              children: [
                const Icon(Icons.payments_rounded, size: 16, color: Color(0xFF0284C7)),
                const SizedBox(width: 6),
                Text(
                  'PAYMENT METHOD',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF0284C7),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Payment Option Cards
            Row(
              children: methods.map((m) {
                final isSelected = state.paymentMethod == m['key'];
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      state.setPaymentMethod(m['key'] as String);
                      setState(() {});
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: EdgeInsets.only(right: m['key'] != 'UPI' ? 10 : 0),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? const Color(0xFFDC2626) : const Color(0xFFE2E8F0),
                          width: isSelected ? 1.5 : 1,
                        ),
                        boxShadow: isSelected
                            ? const [
                                BoxShadow(
                                  color: Color(0x1ADC2626),
                                  blurRadius: 4,
                                  offset: Offset(0, 2),
                                ),
                              ]
                            : null,
                      ),
                      child: Column(
                        children: [
                          Icon(
                            m['icon'] as IconData,
                            size: 19,
                            color: isSelected ? const Color(0xFFDC2626) : const Color(0xFF64748B),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            m['title'] as String,
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected ? const Color(0xFFDC2626) : const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  // ================= 4. REDESIGNED BILL AMOUNT CARD =================
  Widget _buildRedesignedBillAmountCard(AppState state) {
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
                const Icon(Icons.currency_rupee_rounded, size: 16, color: Color(0xFF0F172A)),
                const SizedBox(width: 6),
                Text(
                  'BILL AMOUNT',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF0F172A),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),

            // Single Clean Input Field (Blended directly into card, zero nested boxes/outlines)
            Row(
              children: [
                Text(
                  '₹',
                  style: GoogleFonts.inter(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF0F172A),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _amountController,
                    keyboardType: TextInputType.number,
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                    ),
                    decoration: InputDecoration(
                      hintText: '0',
                      hintStyle: GoogleFonts.inter(
                        color: const Color(0xFF94A3B8),
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                      border: InputBorder.none,
                      focusedBorder: InputBorder.none,
                      enabledBorder: InputBorder.none,
                      errorBorder: InputBorder.none,
                      disabledBorder: InputBorder.none,
                      isDense: true,
                      contentPadding: const EdgeInsets.symmetric(vertical: 4),
                    ),
                    onChanged: (v) {
                      final amount = double.tryParse(v.replaceAll(',', '').trim()) ?? 0;
                      state.setCollectedAmount(amount);
                      setState(() {});
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ================= 5. INLINE SUBMIT BUTTON =================
  Widget _buildInlineSubmitButton(BuildContext context, AppState state, bool canSubmit, bool hasValidAmount) {
    String buttonLabel;
    if (canSubmit) {
      buttonLabel = 'COMPLETE DELIVERY';
    } else if (state.selectedCustomer == null) {
      buttonLabel = 'SELECT CUSTOMER';
    } else if (state.totalCylinders == 0) {
      buttonLabel = 'SELECT CYLINDERS';
    } else if (state.paymentMethod.isEmpty) {
      buttonLabel = 'SELECT PAYMENT METHOD';
    } else {
      buttonLabel = 'ENTER BILL AMOUNT';
    }

    return SizedBox(
      width: double.infinity,
      height: 50,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          gradient: canSubmit && !_isSubmitting
              ? const LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Color(0xFF991B1B),
                    Color(0xFFDC2626),
                  ],
                )
              : null,
          color: canSubmit ? null : const Color(0xFFE2E8F0),
          boxShadow: canSubmit && !_isSubmitting
              ? const [
                  BoxShadow(
                    color: Color(0x30DC2626),
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: _isSubmitting
                ? null
                : () {
                    if (canSubmit) {
                      _submitDelivery(state);
                    } else {
                      String msg = 'Please fill all required fields';
                      if (state.selectedCustomer == null) {
                        msg = 'Please select or enter customer name';
                      } else if (state.totalCylinders == 0) {
                        msg = 'Please select at least 1 cylinder to deliver';
                      } else if (state.paymentMethod.isEmpty) {
                        msg = 'Please select payment method (Cash / UPI)';
                      } else if (!hasValidAmount) {
                        msg = 'Please enter a valid bill amount';
                      }
                      ScaffoldMessenger.of(context).hideCurrentSnackBar();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(msg),
                          backgroundColor: const Color(0xFFDC2626),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    }
                  },
            borderRadius: BorderRadius.circular(14),
            child: Center(
              child: _isSubmitting
                  ? Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        ),
                        SizedBox(width: 10),
                        Text(
                          'FINALIZING INVOICE...',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          buttonLabel,
                          style: TextStyle(
                            fontSize: canSubmit ? 14 : 12.5,
                            fontWeight: FontWeight.w800,
                            color: canSubmit ? Colors.white : const Color(0xFF94A3B8),
                            letterSpacing: 0.5,
                          ),
                        ),
                        if (canSubmit) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                        ],
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}
