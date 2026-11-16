import '../widgets/app_toast.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import '../services/api_service.dart';
import 'success_screen.dart';

class AddDeliveryScreen extends StatefulWidget {
  const AddDeliveryScreen({super.key});

  @override
  State<AddDeliveryScreen> createState() => _AddDeliveryScreenState();
}

class _AddDeliveryScreenState extends State<AddDeliveryScreen> {
  final _amountController = TextEditingController();
  final _splitCashController = TextEditingController();
  final _splitUpiController = TextEditingController();
  final _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final state = AppStateProvider.of(context);
        state.fetchCustomers();
        if (state.paymentMethod.isEmpty) {
          state.setPaymentMethod('Cash');
        }
      }
    });
  }

  @override
  void dispose() {
    _amountController.dispose();
    _splitCashController.dispose();
    _splitUpiController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _submitDelivery(AppState state) async {
    if (state.paymentMethod.toLowerCase() == 'split') {
      final cashVal = double.tryParse(_splitCashController.text.replaceAll(',', '').trim()) ?? 0;
      final upiVal = double.tryParse(_splitUpiController.text.replaceAll(',', '').trim()) ?? 0;
      final splitSum = cashVal + upiVal;
      state.setSplitAmounts(cashVal, upiVal);
      state.setCollectedAmount(splitSum > 0 ? splitSum : state.totalBillAmount);
    } else {
      final enteredAmount = double.tryParse(_amountController.text.replaceAll(',', '').trim()) ?? 0;
      if (enteredAmount > 0) {
        state.setCollectedAmount(enteredAmount);
      } else if (state.collectedAmount == 0 && state.totalBillAmount > 0) {
        state.setCollectedAmount(state.totalBillAmount);
      }
    }

    // Launch modern half-screen animated submission & PDF preparation modal
    SuccessScreen.processAndShow(context, state: state);
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
    if (state.paymentMethod.isEmpty) {
      state.paymentMethod = 'Cash';
    }

    final isSplit = state.paymentMethod.toLowerCase() == 'split';
    final splitCash = double.tryParse(_splitCashController.text.replaceAll(',', '').trim()) ?? 0;
    final splitUpi = double.tryParse(_splitUpiController.text.replaceAll(',', '').trim()) ?? 0;
    final splitSum = splitCash + splitUpi;

    final enteredAmount = isSplit
        ? splitSum
        : (double.tryParse(_amountController.text.replaceAll(',', '').trim()) ?? 0);
    final effectiveAmount = enteredAmount > 0
        ? enteredAmount
        : (state.collectedAmount > 0 ? state.collectedAmount : state.totalBillAmount);
    final hasValidAmount = effectiveAmount > 0;

    final canSubmit = !state.isShiftLocked &&
        state.selectedCustomer != null &&
        (state.totalCylinders > 0 || state.totalOtherDeliveryCount > 0) &&
        state.paymentMethod.isNotEmpty &&
        hasValidAmount;

    // Calculate completion progress (1: Customer, 2: Cylinders/Products, 3: Payment & Amount)
    int completedStepCount = 0;
    if (state.selectedCustomer != null) completedStepCount++;
    if (state.totalCylinders > 0 || state.totalOtherDeliveryCount > 0) completedStepCount++;
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
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: InkWell(
              onTap: () => _showNewConnectionModal(context, state),
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDF2F4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFF800020), width: 1.2),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.add_link_rounded, size: 16, color: Color(0xFF800020)),
                    const SizedBox(width: 5),
                    Text(
                      'New Connection',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF800020),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
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
                                  ? const Color(0xFF800020)
                                  : const Color(0xFF64748B),
                            ),
                          ),
                          Text(
                            '$completedStepCount of 3 steps',
                            style: TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: isDone ? const Color(0xFF800020) : const Color(0xFF64748B),
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
                            Color(0xFF800020),
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
            if (state.isShiftLocked) ...[
              Container(
                margin: const EdgeInsets.only(bottom: 14),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF800020).withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF800020).withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lock_clock_rounded, color: Color(0xFF800020), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Shift End request submitted. New deliveries are locked awaiting Godown settlement.',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF800020),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            // 1. Customer Section
            _buildCustomerCardOrSelector(state),

            const SizedBox(height: 14),

            // 2. Unified Cylinder to Deliver & Return Empty Section (Single Table)
            _buildUnifiedCylinderTableCard(state),

            // 2.1 Other Products Section
            if (state.otherProducts.any((p) => p.balanceStock > 0)) ...[
              const SizedBox(height: 14),
              _buildOtherProductsCard(state),
            ],

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
    final isSearching = trimmedQuery.isNotEmpty;

    // Customer Dropdown Filter (Sundry Debtors from Backend)
    // Only show customers if the driver types letters or numbers
    final filtered = !isSearching
        ? <Customer>[]
        : state.customers.where((item) {
            final q = trimmedQuery.toLowerCase();
            final nameMatch = item.name.toLowerCase().contains(q);
            final phoneDigits = item.phone.replaceAll(RegExp(r'[^0-9]'), '');
            final phoneMatch = item.phone.toLowerCase().contains(q) ||
                (phoneDigits.isNotEmpty && phoneDigits.contains(q));
            final shopMatch = item.shopId != null && item.shopId!.toLowerCase().contains(q);
            final addressMatch = item.address.toLowerCase().contains(q);
            return nameMatch || phoneMatch || shopMatch || addressMatch;
          }).toList();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
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
                    const Icon(Icons.person_rounded, size: 16, color: Color(0xFF800020)),
                    const SizedBox(width: 6),
                    Text(
                      'CUSTOMER',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF800020),
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
                          color: const Color(0xFF800020),
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
                      width: 38,
                      height: 38,
                      decoration: const BoxDecoration(
                        color: Color(0xFFFDF2F4),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.person_rounded,
                          size: 20,
                          color: Color(0xFF800020),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            c.name,
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (c.phone.isNotEmpty)
                            Text(
                              c.phone,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (c.outstanding != 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFDF2F4),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFF5C2CB)),
                        ),
                        child: Text(
                          '\u20B9${c.outstanding.abs().toStringAsFixed(0)} ${c.outstanding > 0 ? "Dr" : "Cr"}',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                      ),
                  ],
                ),
              )
            else ...[
              // Enhanced Touch-Friendly Search Input
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSearching ? const Color(0xFF800020) : const Color(0xFFCBD5E1),
                    width: isSearching ? 1.5 : 1.0,
                  ),
                  boxShadow: isSearching
                      ? const [
                          BoxShadow(
                            color: Color(0x10800020),
                            blurRadius: 8,
                            offset: Offset(0, 2),
                          ),
                        ]
                      : null,
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.search_rounded,
                      size: 22,
                      color: isSearching ? const Color(0xFF800020) : const Color(0xFF64748B),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _searchController,
                        onChanged: (v) => setState(() => _searchQuery = v),
                        onSubmitted: (v) {
                          _selectOrAddCustomCustomer(state, v);
                        },
                        decoration: InputDecoration(
                          hintText: 'Type name or phone to search customer...',
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
                          contentPadding: EdgeInsets.zero,
                        ),
                        style: GoogleFonts.inter(
                          fontSize: 15,
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
                          padding: EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          child: Icon(Icons.cancel_rounded, size: 20, color: Color(0xFF94A3B8)),
                        ),
                      ),
                  ],
                ),
              ),

              // When driver is typing (1st letter/number typed): Show dropdown options
              if (isSearching) ...[
                const SizedBox(height: 10),

                // Dropdown list of matching Sundry Debtors
                if (filtered.isNotEmpty) ...[
                  Padding(
                    padding: const EdgeInsets.only(top: 2, bottom: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'CUSTOMERS FOUND (${filtered.length})',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF800020),
                            letterSpacing: 0.5,
                          ),
                        ),
                     
                      ],
                    ),
                  ),
                  Container(
                    constraints: const BoxConstraints(maxHeight: 280),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x0C0F172A),
                          blurRadius: 10,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: ListView.separated(
                        shrinkWrap: true,
                        padding: EdgeInsets.zero,
                        physics: const ClampingScrollPhysics(),
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
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              child: Row(
                                children: [
                                  Container(
                                    width: 36,
                                    height: 36,
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFDF2F4),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Center(
                                      child: Text(
                                        cust.name.isNotEmpty ? cust.name.substring(0, 1).toUpperCase() : 'C',
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF800020),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          cust.name,
                                          style: GoogleFonts.inter(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w700,
                                            color: const Color(0xFF0F172A),
                                          ),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                        if (cust.phone.isNotEmpty || cust.address.isNotEmpty)
                                          Text(
                                            cust.address.isNotEmpty
                                                ? '${cust.phone.isNotEmpty ? "${cust.phone} \u2022 " : ""}${cust.address}'
                                                : cust.phone,
                                            style: GoogleFonts.inter(
                                              fontSize: 11,
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
                                    size: 18,
                                    color: Color(0xFF94A3B8),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                ] else
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.search_off_rounded, size: 28, color: Color(0xFF94A3B8)),
                          const SizedBox(height: 6),
                          Text(
                            'No customer found matching "$trimmedQuery"',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
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
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Header
            Row(
              children: [
                const Icon(Icons.propane_tank_rounded, size: 18, color: Color(0xFF800020)),
                const SizedBox(width: 6),
                Text(
                  'CYLINDERS TO DELIVER',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Table Column Headers: Weight (KG) | Filled | Empty
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    flex: 5,
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
                    flex: 7,
                    child: Text(
                      'Filled',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF800020),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 7,
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
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Weight & Stock Column (Clean Minimal Design)
                    Expanded(
                      flex: 5,
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
                              cyl.weight,
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Padding(
                            padding: const EdgeInsets.only(left: 2),
                            child: Text(
                              hasStock ? '${cyl.filledStock} left' : '0 left',
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

                    // Filled Delivery Stepper Pill [- QTY +]
                    Expanded(
                      flex: 7,
                      child: Center(
                        child: _buildStepperPill(
                          qty: filledQty,
                          canDecrease: filledQty > 0,
                          canIncrease: filledQty < cyl.filledStock,
                          activeColor: const Color(0xFF800020),
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
                      flex: 7,
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
              );
            }),

          ],
        ),
      ),
    );
  }

  // Stepper Pill Widget with compact, responsive touch-friendly targets
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
      padding: const EdgeInsets.symmetric(horizontal: 2, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? Colors.white : const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: isSelected ? activeColor : const Color(0xFFCBD5E1),
          width: isSelected ? 1.5 : 1.0,
        ),
        boxShadow: isSelected
            ? [
                BoxShadow(
                  color: activeColor.withValues(alpha: 0.10),
                  blurRadius: 4,
                  offset: const Offset(0, 1.5),
                ),
              ]
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Minus button
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: canDecrease
                  ? () {
                      HapticFeedback.lightImpact();
                      onDecrease();
                    }
                  : null,
              borderRadius: BorderRadius.circular(7),
              child: Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: canDecrease ? const Color(0xFFF1F5F9) : Colors.transparent,
                  borderRadius: BorderRadius.circular(7),
                ),
                alignment: Alignment.center,
                child: Icon(
                  Icons.remove_rounded,
                  size: 17,
                  color: canDecrease ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
                ),
              ),
            ),
          ),

          // Count Text
          Container(
            width: 24,
            alignment: Alignment.center,
            child: Text(
              '$qty',
              style: GoogleFonts.inter(
                fontSize: 14.5,
                fontWeight: FontWeight.w800,
                color: isSelected ? activeColor : const Color(0xFF64748B),
              ),
            ),
          ),

          // Plus button
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: canIncrease
                  ? () {
                      HapticFeedback.lightImpact();
                      onIncrease();
                    }
                  : null,
              borderRadius: BorderRadius.circular(7),
              child: Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: canIncrease
                      ? (isSelected ? activeColor.withValues(alpha: 0.10) : const Color(0xFFF1F5F9))
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(7),
                ),
                alignment: Alignment.center,
                child: Icon(
                  Icons.add_rounded,
                  size: 17,
                  color: canIncrease ? (isSelected ? activeColor : const Color(0xFF0F172A)) : const Color(0xFFCBD5E1),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }



  // ================= 2.1 OTHER PRODUCTS TABLE CARD =================
  Widget _buildOtherProductsCard(AppState state) {
    final otherList = state.otherProducts.where((p) => p.balanceStock > 0).toList();
    if (otherList.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Header (Identical to Cylinders above)
            Row(
              children: [
                const Icon(Icons.category_rounded, size: 18, color: Color(0xFF800020)),
                const SizedBox(width: 6),
                Text(
                  'OTHER PRODUCTS TO DELIVER',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Table Column Headers: Product | Deliver Qty (Identical to Cylinders above)
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
                      'Product',
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
                      'Deliver Qty',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF800020),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),

            // Table Rows (Identical to Cylinders above)
            ...otherList.map((prod) {
              final qty = state.getOtherDeliveryQty(prod.name);
              final hasStock = prod.balanceStock > 0;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Product & Stock Column (Identical to Weight & Stock above)
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
                              prod.name,
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                                letterSpacing: 0.2,
                              ),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Padding(
                            padding: const EdgeInsets.only(left: 2),
                            child: Text(
                              '${prod.balanceStock} left',
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

                    // Deliver Stepper Pill (Identical to Filled Stepper Pill above)
                    Expanded(
                      flex: 4,
                      child: Center(
                        child: _buildStepperPill(
                          qty: qty,
                          canDecrease: qty > 0,
                          canIncrease: hasStock ? qty < prod.balanceStock : false,
                          activeColor: const Color(0xFF800020),
                          onDecrease: () {
                            state.updateOtherDeliveryQty(prod.name, qty - 1);
                            setState(() {});
                          },
                          onIncrease: () {
                            state.updateOtherDeliveryQty(prod.name, qty + 1);
                            setState(() {});
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
    );
  }

  // ================= 3. PAYMENT METHOD SECTION =================
  Widget _buildPaymentMethodSection(AppState state) {
    final methods = [
      {'key': 'Cash', 'title': 'Cash', 'icon': Icons.payments_outlined},
      {'key': 'UPI', 'title': 'Bank', 'icon': Icons.qr_code_2_rounded},
      {'key': 'Split', 'title': 'Split', 'icon': Icons.call_split_rounded},
    ];

    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Section Header
            Row(
              children: [
                const Icon(Icons.payments_rounded, size: 16, color: Color(0xFF800020)),
                const SizedBox(width: 6),
                Text(
                  'PAYMENT METHOD',
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

            // Payment Option Cards
            Row(
              children: methods.map((m) {
                final isSelected = state.paymentMethod == m['key'];
                return Expanded(
                  child: GestureDetector(
                    onTap: () {
                      state.setPaymentMethod(m['key'] as String);
                      if (m['key'] == 'Split' && state.totalBillAmount > 0) {
                        if (_splitCashController.text.isEmpty && _splitUpiController.text.isEmpty) {
                          _splitCashController.text = (state.totalBillAmount / 2).toStringAsFixed(0);
                          _splitUpiController.text = (state.totalBillAmount - (state.totalBillAmount / 2)).toStringAsFixed(0);
                          state.setSplitAmounts(
                            double.tryParse(_splitCashController.text) ?? 0,
                            double.tryParse(_splitUpiController.text) ?? 0,
                          );
                        }
                      }
                      setState(() {});
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      margin: EdgeInsets.only(right: m['key'] != 'Split' ? 8 : 0),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      decoration: BoxDecoration(
                        color: isSelected ? const Color(0xFFFDF2F4) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF800020) : const Color(0xFFE2E8F0),
                          width: isSelected ? 1.5 : 1,
                        ),
                        boxShadow: isSelected
                            ? const [
                                BoxShadow(
                                  color: Color(0x20800020),
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
                            color: isSelected ? const Color(0xFF800020) : const Color(0xFF64748B),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            m['title'] as String,
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                              color: isSelected ? const Color(0xFF800020) : const Color(0xFF475569),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            if (state.paymentMethod == 'Split') ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDF2F4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF5C2CB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'SPLIT PAYMENT AMOUNTS',
                          style: GoogleFonts.inter(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF800020),
                            letterSpacing: 0.5,
                          ),
                        ),
                        if (state.totalBillAmount > 0)
                          Text(
                            'Bill Total: \u20B9${state.totalBillAmount.toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF475569),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Cash (\u20B9)',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF475569)),
                              ),
                              const SizedBox(height: 4),
                              TextField(
                                controller: _splitCashController,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                                decoration: InputDecoration(
                                  hintText: '0',
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5)),
                                ),
                                onChanged: (val) {
                                  final c = double.tryParse(val.replaceAll(',', '').trim()) ?? 0;
                                  if (state.totalBillAmount > 0 && c <= state.totalBillAmount) {
                                    final rem = (state.totalBillAmount - c).clamp(0.0, state.totalBillAmount);
                                    _splitUpiController.text = rem > 0 ? rem.toStringAsFixed(0) : '0';
                                  }
                                  final u = double.tryParse(_splitUpiController.text.replaceAll(',', '').trim()) ?? 0;
                                  state.setSplitAmounts(c, u);
                                  setState(() {});
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Bank / UPI (\u20B9)',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF475569)),
                              ),
                              const SizedBox(height: 4),
                              TextField(
                                controller: _splitUpiController,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                                decoration: InputDecoration(
                                  hintText: '0',
                                  filled: true,
                                  fillColor: Colors.white,
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5)),
                                ),
                                onChanged: (val) {
                                  final u = double.tryParse(val.replaceAll(',', '').trim()) ?? 0;
                                  final c = double.tryParse(_splitCashController.text.replaceAll(',', '').trim()) ?? 0;
                                  state.setSplitAmounts(c, u);
                                  setState(() {});
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
    );
  }

  // ================= 4. REDESIGNED BILL AMOUNT CARD =================
  Widget _buildRedesignedBillAmountCard(AppState state) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
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
                  'PAID AMOUNT',
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
                  '\u20B9',
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
          gradient: canSubmit
              ? const LinearGradient(
                  begin: Alignment.centerLeft,
                  end: Alignment.centerRight,
                  colors: [
                    Color(0xFF5A0016),
                    Color(0xFF800020),
                  ],
                )
              : null,
          color: canSubmit ? null : const Color(0xFFE2E8F0),
        ),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
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
                AppToast.warning(context, msg);
              }
            },
            borderRadius: BorderRadius.circular(14),
            child: Center(
              child: Row(
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

  void _showNewConnectionModal(BuildContext context, AppState state) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _NewConnectionSheet(parentState: state),
    );
  }
}

class _NewConnectionSheet extends StatefulWidget {
  final AppState parentState;
  const _NewConnectionSheet({required this.parentState});

  @override
  State<_NewConnectionSheet> createState() => _NewConnectionSheetState();
}

class _NewConnectionSheetState extends State<_NewConnectionSheet> {
  List<Map<String, dynamic>> _packages = [];
  Map<String, dynamic>? _selectedPackage;
  Customer? _selectedCustomer;
  String _paymentMode = 'Cash';
  final _cashController = TextEditingController();
  final _upiController = TextEditingController();
  final _searchCustController = TextEditingController();
  bool _isLoadingPackages = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _selectedCustomer = widget.parentState.selectedCustomer;
    _fetchPackages();
  }

  @override
  void dispose() {
    _cashController.dispose();
    _upiController.dispose();
    _searchCustController.dispose();
    super.dispose();
  }

  Future<void> _fetchPackages() async {
    setState(() => _isLoadingPackages = true);
    try {
      final pkgs = await ApiService.getConnectionPackages();
      if (mounted) {
        setState(() {
          _packages = pkgs;
          _selectedPackage = null;
          _isLoadingPackages = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _isLoadingPackages = false);
      }
    }
  }

  void _syncSplitAmounts() {
    if (_selectedPackage == null) return;
    final total = safeDouble(_selectedPackage!['TotalAmount']);
    if (_paymentMode == 'Split') {
      final half = (total / 2).roundToDouble();
      _cashController.text = half.toStringAsFixed(0);
      _upiController.text = (total - half).toStringAsFixed(0);
    }
  }

  Future<void> _submitPackageDelivery() async {
    if (_selectedCustomer == null) {
      AppToast.warning(context, 'Please select or add a customer');
      return;
    }
    if (_selectedPackage == null) {
      AppToast.warning(context, 'Please select a connection package');
      return;
    }

    final total = safeDouble(_selectedPackage!['TotalAmount']);
    double cashAmt = 0.0;
    double upiAmt = 0.0;

    if (_paymentMode == 'Split') {
      cashAmt = double.tryParse(_cashController.text.replaceAll(',', '').trim()) ?? 0;
      upiAmt = double.tryParse(_upiController.text.replaceAll(',', '').trim()) ?? 0;
      if (cashAmt + upiAmt <= 0) {
        AppToast.warning(context, 'Please enter valid split cash and UPI amounts');
        return;
      }
    } else if (_paymentMode == 'Cash') {
      cashAmt = total;
    } else {
      upiAmt = total;
    }

    setState(() => _isSubmitting = true);

    try {
      final order = await widget.parentState.recordPackageDelivery(
        customer: _selectedCustomer!,
        package: _selectedPackage!,
        paymentMode: _paymentMode,
        totalAmount: total,
        cashAmount: cashAmt,
        upiAmount: upiAmt,
      );

      if (!mounted) return;
      Navigator.pop(context); // Close bottom sheet

      if (order != null) {
        SuccessScreen.show(context, order: order);
      } else {
        AppToast.success(context, 'New connection recorded successfully');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        AppToast.error(context, 'Failed to record connection: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final totalAmount = safeDouble(_selectedPackage?['TotalAmount']);

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.9,
      ),
      padding: EdgeInsets.fromLTRB(18, 16, 18, 16 + bottomInset),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Drag handle
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
          const SizedBox(height: 12),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(7),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.add_link_rounded, size: 20, color: Color(0xFF800020)),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'New Gas Connection',
                        style: GoogleFonts.inter(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Scrollable fields
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Customer Selector
                  _buildCustomerSection(),

                  const SizedBox(height: 14),

                  // 2. Package Selector
                  _buildPackageSection(),

                  const SizedBox(height: 14),

                  // 3. Payment Method
                  _buildPaymentSection(totalAmount),
                ],
              ),
            ),
          ),

          const SizedBox(height: 14),

          // Submit Button
          ElevatedButton(
            onPressed: (_isSubmitting || _isLoadingPackages || _selectedPackage == null)
                ? null
                : _submitPackageDelivery,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF800020),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 0,
            ),
            child: _isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : Text(
                    _selectedPackage == null
                        ? 'Select Connection Package'
                        : 'Confirm Connection \u2022 \u20B9${totalAmount.toStringAsFixed(0)}',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildCustomerSection() {
    return Container(
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
            children: [
              const Icon(Icons.person_outline_rounded, size: 15, color: Color(0xFF800020)),
              const SizedBox(width: 6),
              Text(
                'CUSTOMER',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF800020),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_selectedCustomer != null) ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _selectedCustomer!.name,
                        style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                      ),
                      if (_selectedCustomer!.phone.isNotEmpty)
                        Text(
                          _selectedCustomer!.phone,
                          style: GoogleFonts.inter(fontSize: 11.5, color: const Color(0xFF64748B)),
                        ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () {
                    setState(() => _selectedCustomer = null);
                  },
                  child: Text('Change', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF800020))),
                ),
              ],
            ),
          ] else ...[
            TextField(
              controller: _searchCustController,
              decoration: InputDecoration(
                hintText: 'Search or type customer name...',
                hintStyle: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF64748B)),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
              ),
              onChanged: (_) => setState(() {}),
            ),
            if (_searchCustController.text.trim().isNotEmpty) ...[
              const SizedBox(height: 6),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 140),
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    ...widget.parentState.customers
                        .where((c) => c.name.toLowerCase().contains(_searchCustController.text.toLowerCase()) ||
                            c.phone.contains(_searchCustController.text))
                        .map((c) => ListTile(
                              dense: true,
                              title: Text(c.name, style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600)),
                              subtitle: Text(c.phone, style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B))),
                              onTap: () {
                                setState(() {
                                  _selectedCustomer = c;
                                  _searchCustController.clear();
                                });
                              },
                            )),
                    ListTile(
                      dense: true,
                      leading: const Icon(Icons.add, size: 16, color: Color(0xFF800020)),
                      title: Text(
                        'Add "${_searchCustController.text.trim()}" as Direct Customer',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF800020)),
                      ),
                      onTap: () {
                        setState(() {
                          _selectedCustomer = Customer(
                            name: _searchCustController.text.trim(),
                            phone: '',
                            address: '',
                            type: 'Direct',
                          );
                          _searchCustController.clear();
                        });
                      },
                    ),
                  ],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }

  Widget _buildPackageSection() {
    if (_isLoadingPackages) {
      return Container(
        padding: const EdgeInsets.all(20),
        alignment: Alignment.center,
        child: const SizedBox(
          width: 24,
          height: 24,
          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF800020)),
        ),
      );
    }

    if (_packages.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEB),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: Text(
          'No connection packages found. Please create packages in the Web ERP first.',
          style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF92400E)),
        ),
      );
    }

    return Container(
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
            children: [
              const Icon(Icons.inventory_2_outlined, size: 15, color: Color(0xFF800020)),
              const SizedBox(width: 6),
              Text(
                'CONNECTION PACKAGE',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF800020),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          // Dropdown
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFCBD5E1)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<int>(
                isExpanded: true,
                value: _selectedPackage != null ? safeInt(_selectedPackage!['PackageId']) : null,
                hint: Text(
                  'Select connection package...',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: const Color(0xFF64748B),
                    fontWeight: FontWeight.w500,
                  ),
                ),
                items: _packages.map((pkg) {
                  return DropdownMenuItem<int>(
                    value: safeInt(pkg['PackageId']),
                    child: Text(
                      '${pkg['PackageName']} (\u20B9${safeDouble(pkg['TotalAmount']).toStringAsFixed(0)})',
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
                    ),
                  );
                }).toList(),
                onChanged: (pkgId) {
                  if (pkgId != null) {
                    setState(() {
                      _selectedPackage = _packages.firstWhere((p) => safeInt(p['PackageId']) == pkgId);
                      _syncSplitAmounts();
                    });
                  }
                },
              ),
            ),
          ),

          if (_selectedPackage != null) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                     
                      Text(
                        '${_selectedPackage!['cylinder_name'] ?? 'LPG Cylinder'} \u00D7 ${_selectedPackage!['CylinderQty'] ?? 1}',
                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if ((_selectedPackage!['items'] as List<dynamic>? ?? []).isNotEmpty) ...[
                    Text(
                      'Included Accessories:',
                      style: GoogleFonts.inter(fontSize: 11.5, color: const Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 2),
                    ...(_selectedPackage!['items'] as List<dynamic>).map((it) => Padding(
                          padding: const EdgeInsets.only(left: 8, bottom: 2),
                          child: Text(
                            '\u2022 ${it['ProductName'] ?? it['product_name'] ?? 'Accessory'} \u00D7 ${it['Quantity'] ?? 1}',
                            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF334155)),
                          ),
                        )),
                  ],
                  const Divider(height: 12, color: Color(0xFFF1F5F9)),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Total Package Cost:',
                        style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w800, color: const Color(0xFF800020)),
                      ),
                      Text(
                        '\u20B9${safeDouble(_selectedPackage!['TotalAmount']).toStringAsFixed(0)}',
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w900, color: const Color(0xFF800020)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentSection(double totalAmount) {
    final modes = [
      {'key': 'Cash', 'title': 'Cash', 'icon': Icons.payments_outlined},
      {'key': 'UPI', 'title': 'Bank', 'icon': Icons.qr_code_2_rounded},
      {'key': 'Split', 'title': 'Split', 'icon': Icons.call_split_rounded},
    ];

    return Container(
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
            children: [
              const Icon(Icons.payment_rounded, size: 15, color: Color(0xFF800020)),
              const SizedBox(width: 6),
              Text(
                'PAYMENT METHOD',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF800020),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),

          Row(
            children: modes.map((m) {
              final isSel = _paymentMode == m['key'];
              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _paymentMode = m['key'] as String;
                      _syncSplitAmounts();
                    });
                  },
                  child: Container(
                    margin: EdgeInsets.only(right: m['key'] != 'Split' ? 8 : 0),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    decoration: BoxDecoration(
                      color: isSel ? const Color(0xFFFDF2F4) : Colors.white,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: isSel ? const Color(0xFF800020) : const Color(0xFFCBD5E1),
                        width: isSel ? 1.5 : 1,
                      ),
                    ),
                    child: Column(
                      children: [
                        Icon(m['icon'] as IconData, size: 18, color: isSel ? const Color(0xFF800020) : const Color(0xFF64748B)),
                        const SizedBox(height: 3),
                        Text(
                          m['title'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                            color: isSel ? const Color(0xFF800020) : const Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),

          if (_paymentMode == 'Split') ...[
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Cash (\u20B9)', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF475569))),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _cashController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w700),
                        decoration: InputDecoration(
                          hintText: '0',
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5)),
                        ),
                        onChanged: (val) {
                          final c = double.tryParse(val.replaceAll(',', '').trim()) ?? 0;
                          if (totalAmount > 0 && c <= totalAmount) {
                            final rem = (totalAmount - c).clamp(0.0, totalAmount);
                            _upiController.text = rem.toStringAsFixed(0);
                          }
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Bank / UPI (\u20B9)', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF475569))),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _upiController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w700),
                        decoration: InputDecoration(
                          hintText: '0',
                          filled: true,
                          fillColor: Colors.white,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5)),
                        ),
                        onChanged: (val) {
                          final u = double.tryParse(val.replaceAll(',', '').trim()) ?? 0;
                          if (totalAmount > 0 && u <= totalAmount) {
                            final rem = (totalAmount - u).clamp(0.0, totalAmount);
                            _cashController.text = rem.toStringAsFixed(0);
                          }
                          setState(() {});
                        },
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
