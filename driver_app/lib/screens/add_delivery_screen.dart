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

  Future<void> _submitDelivery(AppState state, {bool autoShareWhatsApp = false}) async {
    if (state.isShiftLocked || state.endShiftStatus.toUpperCase() != 'ACTIVE') {
      AppToast.error(context, 'Shift ended. Awaiting approval or new load allocation.');
      return;
    }

    final isEmptiesOnly = state.totalCylinders == 0 && state.totalOtherDeliveryCount == 0 && state.totalEmpties > 0;
    final isSplit = state.paymentMethod.toLowerCase() == 'split';
    final textTrim = _amountController.text.trim();
    final enteredAmount = double.tryParse(textTrim.replaceAll(',', '')) ?? 0;

    if (isEmptiesOnly && (textTrim.isEmpty || textTrim == '0' || textTrim == '0.0' || enteredAmount <= 0)) {
      state.setPaymentMethod('N/A');
      state.setCollectedAmount(0.0);
    } else if (isSplit) {
      final cashVal = double.tryParse(_splitCashController.text.replaceAll(',', '').trim()) ?? 0;
      final upiVal = double.tryParse(_splitUpiController.text.replaceAll(',', '').trim()) ?? 0;
      final splitSum = cashVal + upiVal;
      state.setSplitAmounts(cashVal, upiVal);
      state.setCollectedAmount(splitSum);
    } else {
      if (textTrim == '0' || textTrim == '0.0') {
        state.setCollectedAmount(0.0);
      } else if (enteredAmount > 0) {
        state.setCollectedAmount(enteredAmount);
      } else if (textTrim.isEmpty) {
        state.setCollectedAmount(isEmptiesOnly ? 0.0 : state.totalBillAmount);
      } else {
        state.setCollectedAmount(0.0);
      }
    }

    // Launch modern half-screen animated submission & PDF preparation modal
    SuccessScreen.processAndShow(context, state: state, autoShareWhatsApp: autoShareWhatsApp);
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
    final isEmptiesOnly = state.totalCylinders == 0 && state.totalOtherDeliveryCount == 0 && state.totalEmpties > 0;
    if (state.paymentMethod.isEmpty && !isEmptiesOnly) {
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
        : (_amountController.text.trim() == '0'
            ? 0.0
            : (state.collectedAmount > 0 ? state.collectedAmount : (isEmptiesOnly ? 0.0 : state.totalBillAmount)));

    final hasItems = state.totalCylinders > 0 || state.totalOtherDeliveryCount > 0 || state.totalEmpties > 0;
    final hasValidAmount = _amountController.text.trim() == '0' || effectiveAmount >= 0;

    final canSubmit = !state.isShiftLocked &&
        state.endShiftStatus.toUpperCase() == 'ACTIVE' &&
        state.selectedCustomer != null &&
        hasItems &&
        (isEmptiesOnly
            ? (enteredAmount <= 0 || state.paymentMethod.isNotEmpty)
            : state.paymentMethod.isNotEmpty);

    // Calculate completion progress (1: Customer, 2: Cylinders/Products, 3: Payment & Amount)
    int completedStepCount = 0;
    if (state.selectedCustomer != null) completedStepCount++;
    if (hasItems) completedStepCount++;
    if (isEmptiesOnly || state.paymentMethod.isNotEmpty) completedStepCount++;
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
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Color(0xFF5A0016),
                      Color(0xFF800020),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x33800020),
                      blurRadius: 6,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.add_link_rounded, size: 16, color: Colors.white),
                    const SizedBox(width: 5),
                    Text(
                      'New Connection',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: 0.2,
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
            if (state.isShiftLocked || state.endShiftStatus.toUpperCase() != 'ACTIVE') ...[
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

            // If no customer is selected: guidance banner
            if (state.selectedCustomer == null) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDF2F4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF800020).withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.touch_app_rounded, color: Color(0xFF800020), size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Select a customer above first to enter cylinder quantities & payment.',
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
              const SizedBox(height: 6),
            ],

            // The remaining options only become typable / interactive after selecting a customer
            IgnorePointer(
              ignoring: state.selectedCustomer == null,
              child: Opacity(
                opacity: state.selectedCustomer == null ? 0.38 : 1.0,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
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

                    // 4. Redesigned Bill Amount Collection Card (Hidden for Split)
                    if (!isSplit) ...[
                      _buildRedesignedBillAmountCard(state),
                      const SizedBox(height: 14),
                    ],

                    // 5. Inline Submit Button (directly under Bill Amount / Payment Section)
                    _buildInlineSubmitButton(context, state, canSubmit, hasValidAmount, effectiveAmount, hasItems),
                  ],
                ),
              ),
            ),

            // Responsive clearance for floating pill navbar & classic 3-button system navigation
            SizedBox(height: 84 + MediaQuery.of(context).padding.bottom),
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
    final isEmptiesOnly = state.totalCylinders == 0 && state.totalOtherDeliveryCount == 0 && state.totalEmpties > 0;
    final textTrim = _amountController.text.trim();
    final enteredAmount = double.tryParse(textTrim.replaceAll(',', '')) ?? 0;
    final isZeroAmount = textTrim.isEmpty || textTrim == '0' || textTrim == '0.0' || enteredAmount <= 0;

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

            if (isEmptiesOnly && isZeroAmount) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBFDBFE)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline_rounded, color: Color(0xFF1D4ED8), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Empty Return Only (₹0): No payment needed. An Empty Return Voucher (EMTRTN) will be generated. To collect payment towards customer account balance, enter amount in Paid Amount below.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF1E40AF),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],

            if (isEmptiesOnly && !isZeroAmount) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline_rounded, color: Color(0xFF047857), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Payment on Empty Return (₹${enteredAmount.toStringAsFixed(0)}): Select payment mode below. Official Receipt (RCPT) will be generated.',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF065F46),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
            ],

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
                      margin: EdgeInsets.only(right: m['key'] != 'Split' ? 6 : 0),
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
                              fontSize: 11,
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
  Widget _buildInlineSubmitButton(
    BuildContext context,
    AppState state,
    bool canSubmit,
    bool hasValidAmount,
    double effectiveAmount,
    bool hasItems,
  ) {
    String buttonLabel;
    final isEmptiesOnly = state.totalCylinders == 0 && state.totalOtherDeliveryCount == 0 && state.totalEmpties > 0;
    final textTrim = _amountController.text.trim();
    final enteredAmount = double.tryParse(textTrim.replaceAll(',', '')) ?? 0;
    final isZeroPayment = state.paymentMethod.toLowerCase() != 'split' &&
        (textTrim.isEmpty || textTrim == '0' || textTrim == '0.0' || effectiveAmount == 0);

    if (!canSubmit) {
      if (state.selectedCustomer == null) {
        buttonLabel = 'SELECT CUSTOMER FIRST';
      } else if (!hasItems) {
        buttonLabel = 'SELECT CYLINDERS TO DELIVER OR RETURN';
      } else if (!isEmptiesOnly && state.paymentMethod.isEmpty) {
        buttonLabel = 'SELECT PAYMENT METHOD';
      } else if (isEmptiesOnly && enteredAmount > 0 && state.paymentMethod.isEmpty) {
        buttonLabel = 'SELECT PAYMENT METHOD';
      } else {
        buttonLabel = 'COMPLETE DELIVERY';
      }
    } else if (isEmptiesOnly) {
      if (enteredAmount > 0) {
        buttonLabel = 'RECEIVE PAYMENT & EMPTIES (₹${enteredAmount.toStringAsFixed(0)})';
      } else {
        buttonLabel = 'RECORD EMPTY RETURN (₹0)';
      }
    } else if (effectiveAmount > 0 && !isZeroPayment) {
      buttonLabel = 'COMPLETE DELIVERY (₹${effectiveAmount.toStringAsFixed(0)})';
    } else {
      buttonLabel = 'COMPLETE DELIVERY (₹0)';
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
                if (isEmptiesOnly && enteredAmount <= 0) {
                  _showZeroPaymentConfirmationDialog(context, state);
                } else if (!isEmptiesOnly && isZeroPayment) {
                  _showZeroPaymentConfirmationDialog(context, state);
                } else {
                  _submitDelivery(state);
                }
              } else {
                String msg = 'Please fill all required fields';
                if (state.selectedCustomer == null) {
                  msg = 'Please select a customer first';
                } else if (!hasItems) {
                  msg = 'Please select at least 1 cylinder to deliver or return';
                } else if (!isEmptiesOnly && state.paymentMethod.isEmpty) {
                  msg = 'Please select payment method (Cash, Bank, or Split)';
                } else if (isEmptiesOnly && enteredAmount > 0 && state.paymentMethod.isEmpty) {
                  msg = 'Please select payment method for collected amount';
                } else if (!hasValidAmount) {
                  msg = 'Please enter a valid bill amount';
                }
                AppToast.warning(context, msg);
              }
            },
            borderRadius: BorderRadius.circular(14),
            child: Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Flexible(
                      child: Text(
                        buttonLabel,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: canSubmit ? 13.5 : 12.5,
                          fontWeight: FontWeight.w800,
                          color: canSubmit ? Colors.white : const Color(0xFF94A3B8),
                          letterSpacing: 0.4,
                        ),
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
      ),
    );
  }

  // ================= ZERO PAYMENT / EMPTY RETURN CONFIRMATION DIALOG =================
  void _showZeroPaymentConfirmationDialog(BuildContext context, AppState state) {
    final customer = state.selectedCustomer;
    final customerName = customer?.name ?? 'Customer';
    final customerPhone = customer?.phone.trim() ?? '';
    final totalBill = state.totalBillAmount;
    final isEmptiesOnly = state.totalCylinders == 0 && state.totalOtherDeliveryCount == 0 && state.totalEmpties > 0;

    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (dialogCtx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        elevation: 12,
        backgroundColor: Colors.white,
        insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.all(22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
              // Header Row: Burgundy Accent Icon + Title & Subtitle
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: isEmptiesOnly ? const Color(0xFFEFF6FF) : const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: isEmptiesOnly ? const Color(0xFFBFDBFE) : const Color(0xFFF5C2CB)),
                    ),
                    child: Icon(
                      isEmptiesOnly ? Icons.assignment_return_rounded : Icons.receipt_long_rounded,
                      color: isEmptiesOnly ? const Color(0xFF1D4ED8) : const Color(0xFF800020),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isEmptiesOnly ? 'Confirm Empty Return' : 'Confirm Unpaid Delivery',
                          style: GoogleFonts.inter(
                            fontSize: 16.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isEmptiesOnly
                              ? 'Returning ${state.totalEmpties} empty cylinder(s) • ₹0 payment'
                              : 'Zero payment collected • Added to balance',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // Summary Breakdown Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    // Customer Row
                    Row(
                      children: [
                        Container(
                          width: 28,
                          height: 28,
                          decoration: const BoxDecoration(
                            color: Color(0xFF800020),
                            shape: BoxShape.circle,
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            customerName.isNotEmpty ? customerName.trim().substring(0, 1).toUpperCase() : 'C',
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: Colors.white),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                customerName,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              if (customerPhone.isNotEmpty)
                                Text(
                                  customerPhone,
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 20, color: Color(0xFFE2E8F0)),
                    if (isEmptiesOnly) ...[
                      _buildZeroPaymentRow('Returned Empties', '${state.totalEmpties} NOS', isBold: true),
                      const SizedBox(height: 8),
                      _buildZeroPaymentRow('Collected Amount', '₹0.00 (NO PAYMENT)', valueColor: const Color(0xFF1D4ED8), isBold: true),
                      const Divider(height: 18, color: Color(0xFFE2E8F0)),
                      _buildZeroPaymentRow(
                        'Document Type',
                        'EMTRTN Voucher',
                        valueColor: const Color(0xFF1D4ED8),
                        isBold: true,
                      ),
                    ] else ...[
                      _buildZeroPaymentRow('Total Bill Amount', '₹${totalBill.toStringAsFixed(2)}', isBold: true),
                      const SizedBox(height: 8),
                      _buildZeroPaymentRow('Collected Now', '₹0.00 (UNPAID)', valueColor: const Color(0xFF475569), isBold: true),
                      const Divider(height: 18, color: Color(0xFFE2E8F0)),
                      _buildZeroPaymentRow(
                        'Pending Balance Added',
                        '+₹${totalBill.toStringAsFixed(2)}',
                        valueColor: const Color(0xFF800020),
                        isBold: true,
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // WhatsApp Notice
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  children: [
                    Image.asset(
                      'assets/images/whatsapp_logo.png',
                      width: 18,
                      height: 18,
                      errorBuilder: (context, error, stackTrace) => const Icon(Icons.chat_bubble_outline_rounded, color: Color(0xFF16A34A), size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        isEmptiesOnly
                            ? (customerPhone.isNotEmpty
                                ? 'Empty return voucher (EMTRTN) will be sent to $customerPhone via WhatsApp.'
                                : 'Empty return voucher (EMTRTN) will be shared via WhatsApp.')
                            : (customerPhone.isNotEmpty
                                ? 'Delivery receipt will be sent to $customerPhone via WhatsApp.'
                                : 'Delivery receipt will be generated and shared via WhatsApp.'),
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Action Buttons: Cancel and Confirm & Send
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(dialogCtx),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.2),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: Text(
                        'Cancel',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF475569),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.centerLeft,
                          end: Alignment.centerRight,
                          colors: [
                            Color(0xFF5A0016),
                            Color(0xFF800020),
                          ],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: ElevatedButton.icon(
                        onPressed: () {
                          Navigator.pop(dialogCtx);
                          if (isEmptiesOnly) {
                            state.setPaymentMethod('N/A');
                            state.setCollectedAmount(0.0);
                          } else {
                            if (state.paymentMethod.isEmpty) {
                              state.setPaymentMethod('Cash');
                            }
                            state.setCollectedAmount(0.0);
                          }
                          _submitDelivery(state, autoShareWhatsApp: true);
                        },
                        icon: const Icon(Icons.send_rounded, size: 16, color: Colors.white),
                        label: Text(
                          isEmptiesOnly ? 'Confirm Return' : 'Confirm & Send',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        ),
      ),
    );
  }

  Widget _buildZeroPaymentRow(String label, String value, {Color? valueColor, bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: isBold ? FontWeight.w600 : FontWeight.w500,
            color: const Color(0xFF64748B),
          ),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 12.5,
            fontWeight: isBold ? FontWeight.w800 : FontWeight.w600,
            color: valueColor ?? const Color(0xFF0F172A),
          ),
        ),
      ],
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
    // Keep user-entered amounts; do not enforce arbitrary 50/50 splits
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

    final state = widget.parentState;

    // 1. Validate Van Stock for Cylinder in this package
    final cylinderProductId = _selectedPackage!['CylinderProduct'];
    final cylinderQty = safeInt(_selectedPackage!['CylinderQty'], 1);
    final cylinderName = (_selectedPackage!['cylinder_name'] ?? 'LPG Cylinder').toString();
    if (cylinderProductId != null && cylinderQty > 0) {
      final matchingCyl = state.deliveryItems.firstWhere(
        (it) => it.cylinder.productId == cylinderProductId,
        orElse: () => DeliveryItem(cylinder: CylinderType(weight: '', filledStock: 0, emptyStock: 0, price: 0)),
      );
      if (matchingCyl.cylinder.filledStock < cylinderQty) {
        AppToast.error(
          context,
          'Insufficient van stock for $cylinderName! Available: ${matchingCyl.cylinder.filledStock}, Required: $cylinderQty',
        );
        return;
      }
    }

    // 2. Validate Van Stock for Every Accessory Item in this package
    final pkgItems = _selectedPackage!['items'] as List<dynamic>? ?? [];
    for (final it in pkgItems) {
      final pid = it['Product'] ?? it['product_id'];
      final pName = (it['ProductName'] ?? it['product_name'] ?? 'Accessory').toString();
      final reqQty = safeInt(it['Quantity'], 1);
      if (reqQty <= 0) continue;

      final availProd = state.otherProducts.firstWhere(
        (p) => p.productId == pid || p.name.toLowerCase() == pName.toLowerCase(),
        orElse: () => OtherProductItem(name: pName, price: 0, initialStock: 0, balanceStock: 0),
      );
      if (availProd.balanceStock < reqQty) {
        AppToast.error(
          context,
          'Insufficient van stock for $pName! Available: ${availProd.balanceStock}, Required: $reqQty',
        );
        return;
      }
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
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final double effectiveBottom = bottomInset > 0 ? bottomInset : bottomPadding;
    final totalAmount = safeDouble(_selectedPackage?['TotalAmount']);

    int completedStepCount = 0;
    if (_selectedCustomer != null) completedStepCount++;
    if (_selectedPackage != null) completedStepCount++;
    if (_paymentMode == 'Split') {
      final c = double.tryParse(_cashController.text.replaceAll(',', '').trim()) ?? 0;
      final u = double.tryParse(_upiController.text.replaceAll(',', '').trim()) ?? 0;
      if (c + u > 0) completedStepCount++;
    } else if (_paymentMode.isNotEmpty) {
      completedStepCount++;
    }
    final double completionProgress = completedStepCount / 3.0;

    final bool canSubmit = _selectedCustomer != null &&
        _selectedPackage != null &&
        !_isSubmitting &&
        !_isLoadingPackages &&
        (_paymentMode != 'Split' ||
            ((double.tryParse(_cashController.text.replaceAll(',', '').trim()) ?? 0) +
                    (double.tryParse(_upiController.text.replaceAll(',', '').trim()) ?? 0) >
                0));

    String submitButtonLabel;
    if (_selectedCustomer == null) {
      submitButtonLabel = 'SELECT CUSTOMER';
    } else if (_selectedPackage == null) {
      submitButtonLabel = 'SELECT CONNECTION PACKAGE';
    } else if (_paymentMode == 'Split' &&
        ((double.tryParse(_cashController.text.replaceAll(',', '').trim()) ?? 0) +
                (double.tryParse(_upiController.text.replaceAll(',', '').trim()) ?? 0) <=
            0)) {
      submitButtonLabel = 'ENTER SPLIT AMOUNTS';
    } else {
      submitButtonLabel = 'CONFIRM CONNECTION \u2022 \u20B9${totalAmount.toStringAsFixed(0)}';
    }

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.92,
      ),
      padding: EdgeInsets.fromLTRB(16, 12, 16, 14 + effectiveBottom),
      decoration: const BoxDecoration(
        color: Color(0xFFF1F5F9),
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
          const SizedBox(height: 10),

          // Header Bar
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF5A0016), Color(0xFF800020)],
                      ),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x33800020),
                          blurRadius: 4,
                          offset: Offset(0, 1.5),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.add_link_rounded, size: 18, color: Colors.white),
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
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        'Package setup & payment collection',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B),
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
          const SizedBox(height: 10),

          // Completion Progress Bar (Matches Delivery UI top bar)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      completedStepCount >= 3 ? 'Ready to Confirm' : 'Order Completion',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: completedStepCount >= 3
                            ? const Color(0xFF800020)
                            : const Color(0xFF64748B),
                      ),
                    ),
                    Text(
                      '$completedStepCount of 3 steps',
                      style: GoogleFonts.inter(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: completedStepCount >= 3
                            ? const Color(0xFF800020)
                            : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: completionProgress,
                    backgroundColor: const Color(0xFFE2E8F0),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF800020)),
                    minHeight: 4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Scrollable fields
          Expanded(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Customer Card
                  _buildCustomerSection(),

                  const SizedBox(height: 12),

                  // 2. Package Selector & Components Table Bar
                  _buildPackageSection(),

                  const SizedBox(height: 12),

                  // 3. Payment Method Tabs & Split Bar
                  _buildPaymentSection(totalAmount),
                  
                  const SizedBox(height: 6),
                ],
              ),
            ),
          ),

          const SizedBox(height: 12),

          // Confirm Button (Matches Delivery UI submit button)
          SizedBox(
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
                color: canSubmit ? null : const Color(0xFFCBD5E1),
                boxShadow: canSubmit
                    ? const [
                        BoxShadow(
                          color: Color(0x33800020),
                          blurRadius: 8,
                          offset: Offset(0, 3),
                        ),
                      ]
                    : null,
              ),
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  onTap: canSubmit && !_isSubmitting ? _submitPackageDelivery : null,
                  borderRadius: BorderRadius.circular(14),
                  child: Center(
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                canSubmit ? Icons.check_circle_rounded : Icons.add_link_rounded,
                                size: 18,
                                color: canSubmit ? Colors.white : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                submitButtonLabel,
                                style: GoogleFonts.inter(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w800,
                                  color: canSubmit ? Colors.white : const Color(0xFF64748B),
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ================= 1. CUSTOMER SECTION =================
  Widget _buildCustomerSection() {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x060F172A),
            blurRadius: 4,
            offset: Offset(0, 1.5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.person_rounded, size: 16, color: Color(0xFF800020)),
                  const SizedBox(width: 6),
                  Text(
                    'CUSTOMER DETAILS',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              if (_selectedCustomer != null)
                InkWell(
                  onTap: () => setState(() => _selectedCustomer = null),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.sync_alt_rounded, size: 13, color: Color(0xFF800020)),
                        const SizedBox(width: 4),
                        Text(
                          'Change',
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
            ],
          ),
          const SizedBox(height: 10),
          if (_selectedCustomer != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: Color(0xFF800020),
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      _selectedCustomer!.name.isNotEmpty
                          ? _selectedCustomer!.name.trim().substring(0, 1).toUpperCase()
                          : 'C',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _selectedCustomer!.name,
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            if (_selectedCustomer!.phone.isNotEmpty) ...[
                              const Icon(Icons.phone_outlined, size: 12, color: Color(0xFF64748B)),
                              const SizedBox(width: 4),
                              Text(
                                _selectedCustomer!.phone,
                                style: GoogleFonts.inter(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(width: 8),
                            ],
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE2E8F0),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                _selectedCustomer!.type.isNotEmpty ? _selectedCustomer!.type : 'Customer',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF475569),
                                ),
                              ),
                            ),
                            if (_selectedCustomer!.creditLimit > 0) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFEFF6FF),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFBFDBFE), width: 0.5),
                                ),
                                child: Text(
                                  'Limit: ₹${_selectedCustomer!.creditLimit.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF1D4ED8),
                                  ),
                                ),
                              ),
                            ],
                            if (_selectedCustomer!.emptyStockLimit > 0) ...[
                              const SizedBox(width: 6),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFDF2F4),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFFBCFE8), width: 0.5),
                                ),
                                child: Text(
                                  'Empty Limit: ${_selectedCustomer!.emptyStockLimit.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF800020),
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (_selectedCustomer!.outstanding != 0)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _selectedCustomer!.outstanding > 0 ? const Color(0xFFFEF2F2) : const Color(0xFFF0FDF4),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _selectedCustomer!.outstanding > 0 ? const Color(0xFFFCA5A5) : const Color(0xFF86EFAC),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            _selectedCustomer!.outstanding > 0 ? 'Due' : 'Credit',
                            style: GoogleFonts.inter(
                              fontSize: 9.5,
                              fontWeight: FontWeight.w600,
                              color: _selectedCustomer!.outstanding > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                            ),
                          ),
                          Text(
                            '₹${_selectedCustomer!.outstanding.abs().toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w800,
                              color: _selectedCustomer!.outstanding > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ] else ...[
            TextField(
              controller: _searchCustController,
              decoration: InputDecoration(
                hintText: 'Search customer name or phone...',
                hintStyle: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF94A3B8)),
                prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF800020)),
                suffixIcon: _searchCustController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                        onPressed: () {
                          _searchCustController.clear();
                          setState(() {});
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5),
                ),
              ),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 8),
            Container(
              constraints: const BoxConstraints(maxHeight: 180),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: ListView(
                shrinkWrap: true,
                padding: const EdgeInsets.symmetric(vertical: 4),
                children: [
                  ...widget.parentState.customers
                      .where((c) {
                        final q = _searchCustController.text.trim().toLowerCase();
                        if (q.isEmpty) return true;
                        return c.name.toLowerCase().contains(q) || c.phone.contains(q);
                      })
                      .take(5)
                      .map((c) => InkWell(
                            onTap: () {
                              setState(() {
                                _selectedCustomer = c;
                                _searchCustController.clear();
                              });
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                              decoration: const BoxDecoration(
                                border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
                              ),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 14,
                                    backgroundColor: const Color(0xFFFDF2F4),
                                    child: Text(
                                      c.name.isNotEmpty ? c.name[0].toUpperCase() : 'C',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF800020),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          c.name,
                                          style: GoogleFonts.inter(
                                            fontSize: 12.5,
                                            fontWeight: FontWeight.w700,
                                            color: const Color(0xFF0F172A),
                                          ),
                                        ),
                                        if (c.phone.isNotEmpty)
                                          Text(
                                            c.phone,
                                            style: GoogleFonts.inter(
                                              fontSize: 11,
                                              color: const Color(0xFF64748B),
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                  if (c.outstanding != 0)
                                    Text(
                                      '₹${c.outstanding.toStringAsFixed(0)}',
                                      style: GoogleFonts.inter(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.w700,
                                        color: c.outstanding > 0 ? const Color(0xFFDC2626) : const Color(0xFF16A34A),
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          )),
                  if (_searchCustController.text.trim().isNotEmpty)
                    InkWell(
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
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        color: const Color(0xFFFDF2F4),
                        child: Row(
                          children: [
                            const Icon(Icons.person_add_alt_1_rounded, size: 16, color: Color(0xFF800020)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Add "${_searchCustController.text.trim()}" as Direct Customer',
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
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ================= 2. PACKAGE SELECTOR & COMPONENTS TABLE =================
  Widget _buildPackageSection() {
    if (_isLoadingPackages) {
      return Container(
        padding: const EdgeInsets.all(24),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
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
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFFDE68A)),
        ),
        child: Text(
          'No connection packages found. Please create packages in the Web ERP first.',
          style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF92400E)),
        ),
      );
    }

    final state = widget.parentState;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x060F172A),
            blurRadius: 4,
            offset: Offset(0, 1.5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.propane_tank_rounded, size: 16, color: Color(0xFF800020)),
                  const SizedBox(width: 6),
                  Text(
                    'CONNECTION PACKAGE & ITEMS',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
              if (_selectedPackage != null)
                InkWell(
                  onTap: () => _openPackagePickerSheet(context),
                  borderRadius: BorderRadius.circular(6),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.sync_alt_rounded, size: 13, color: Color(0xFF800020)),
                        const SizedBox(width: 4),
                        Text(
                          'Switch',
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
            ],
          ),
          const SizedBox(height: 10),

          // Interactive Package Card Selector
          if (_selectedPackage == null) ...[
            InkWell(
              onTap: () => _openPackagePickerSheet(context),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFCBD5E1), width: 1.2),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDF2F4),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.inventory_2_outlined, color: Color(0xFF800020), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Select Connection Package',
                            style: GoogleFonts.inter(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${_packages.length} packages available on this route',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF800020), size: 22),
                  ],
                ),
              ),
            ),
          ] else ...[
            // Selected Package Overview Card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFDF2F4),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFF5C2CB)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: const Color(0xFF800020),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.propane_tank_rounded, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _selectedPackage!['PackageName'] ?? 'Connection Package',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          (_selectedPackage!['cylinder_name'] ?? 'LPG Cylinder').toString(),
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: const Color(0xFF800020),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '₹${safeDouble(_selectedPackage!['TotalAmount']).toStringAsFixed(0)}',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Detailed Breakdown Table (Matches Delivery UI Cylinder & Product Table Bars)
          if (_selectedPackage != null) ...[
            const SizedBox(height: 12),

            // Table Column Headers Bar (Identical to Delivery UI)
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
                    flex: 6,
                    child: Text(
                      'Package Component',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 2,
                    child: Text(
                      'Qty',
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
                      'Amount',
                      textAlign: TextAlign.right,
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

            // 1. Cylinder Row
            Builder(
              builder: (context) {
                final cylinderProductId = _selectedPackage!['CylinderProduct'];
                final cylinderQty = safeInt(_selectedPackage!['CylinderQty'], 1);
                final cylinderRate = safeDouble(_selectedPackage!['CylinderRate']);
                final cylinderName = (_selectedPackage!['cylinder_name'] ?? 'LPG Cylinder').toString();

                final matchingCyl = state.deliveryItems.firstWhere(
                  (it) => it.cylinder.productId == cylinderProductId,
                  orElse: () => DeliveryItem(
                    cylinder: CylinderType(weight: '', filledStock: 0, emptyStock: 0, price: 0),
                  ),
                );
                final availStock = matchingCyl.cylinder.filledStock;
                final isStockOk = availStock >= cylinderQty;

                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                  ),
                  child: Row(
                    children: [
                      // Component Name & Stock Pill
                      Expanded(
                        flex: 6,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                cylinderName,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                            ),
                            const SizedBox(height: 3),
                            Padding(
                              padding: const EdgeInsets.only(left: 2),
                              child: Text(
                                '$availStock in van',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: isStockOk ? const Color(0xFF64748B) : const Color(0xFFDC2626),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      // Qty Pill
                      Expanded(
                        flex: 2,
                        child: Center(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFDF2F4),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFF800020).withValues(alpha: 0.3)),
                            ),
                            child: Text(
                              '$cylinderQty',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF800020),
                              ),
                            ),
                          ),
                        ),
                      ),
                      // Amount
                      Expanded(
                        flex: 4,
                        child: Text(
                          '\u20B9${(cylinderRate * cylinderQty).toStringAsFixed(0)}',
                          textAlign: TextAlign.right,
                          style: GoogleFonts.inter(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),

            // 2. Accessories Rows
            ...((_selectedPackage!['items'] as List<dynamic>? ?? []).map((it) {
              final pid = it['Product'] ?? it['product_id'];
              final pName = (it['ProductName'] ?? it['product_name'] ?? 'Accessory').toString();
              final reqQty = safeInt(it['Quantity'], 1);
              final unitPrice = safeDouble(it['UnitPrice']);
              final itemTotal = safeDouble(it['TotalAmount'], unitPrice * reqQty);

              final availProd = state.otherProducts.firstWhere(
                (p) => p.productId == pid || p.name.toLowerCase() == pName.toLowerCase(),
                orElse: () => OtherProductItem(name: pName, price: 0, initialStock: 0, balanceStock: 0),
              );
              final availStock = availProd.balanceStock;
              final isStockOk = availStock >= reqQty;

              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      flex: 6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              pName,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Padding(
                            padding: const EdgeInsets.only(left: 2),
                            child: Text(
                              '$availStock in van',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: isStockOk ? const Color(0xFF64748B) : const Color(0xFFDC2626),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Text(
                            '$reqQty',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Text(
                        '\u20B9${itemTotal.toStringAsFixed(0)}',
                        textAlign: TextAlign.right,
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ],
                ),
              );
            })),

            // 3. Labor / Installation Row (If applicable)
            if (safeDouble(_selectedPackage!['LaborCharge']) > 0) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
                decoration: const BoxDecoration(
                  border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      flex: 6,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFDF2F4),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFF5C2CB)),
                            ),
                            child: Text(
                              (_selectedPackage!['LaborDescription'] ?? 'Fitting & Installation Charge').toString(),
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF800020),
                              ),
                            ),
                          ),
                          const SizedBox(height: 3),
                          Padding(
                            padding: const EdgeInsets.only(left: 2),
                            child: Text(
                              'Service / Setup',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Expanded(
                      flex: 2,
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Text(
                            '1',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      flex: 4,
                      child: Text(
                        '\u20B9${safeDouble(_selectedPackage!['LaborCharge']).toStringAsFixed(0)}',
                        textAlign: TextAlign.right,
                        style: GoogleFonts.inter(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 10),

            // Package Total Summary Bar (Matches Delivery UI Summary Bar)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFFDF2F4),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFF5C2CB)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.receipt_long_rounded, size: 16, color: Color(0xFF800020)),
                      const SizedBox(width: 6),
                      Text(
                        'TOTAL PACKAGE AMOUNT',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF800020),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    '\u20B9${safeDouble(_selectedPackage!['TotalAmount']).toStringAsFixed(0)}',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF800020),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _openPackagePickerSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (pickerCtx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(pickerCtx).size.height * 0.75,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Sheet Handle Bar
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 10, bottom: 8),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: const Color(0xFFCBD5E1),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              // Title Row
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                child: Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDF2F4),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.propane_tank_rounded, color: Color(0xFF800020), size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Select Connection Package',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'Choose package to auto-fill cylinders and accessories',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(pickerCtx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFFE2E8F0)),

              // Package List
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  padding: const EdgeInsets.all(16),
                  itemCount: _packages.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 10),
                  itemBuilder: (_, idx) {
                    final pkg = _packages[idx];
                    final isCurrent = _selectedPackage != null &&
                        safeInt(_selectedPackage!['PackageId']) == safeInt(pkg['PackageId']);
                    final total = safeDouble(pkg['TotalAmount']);
                    final cylName = (pkg['cylinder_name'] ?? 'LPG Cylinder').toString();
                    final items = pkg['items'] as List<dynamic>? ?? [];

                    return InkWell(
                      onTap: () {
                        Navigator.pop(pickerCtx);
                        setState(() {
                          _selectedPackage = pkg;
                          if (_paymentMode == 'Cash') {
                            _cashController.text = total.toStringAsFixed(0);
                            _upiController.text = '0';
                          } else if (_paymentMode == 'UPI') {
                            _cashController.text = '0';
                            _upiController.text = total.toStringAsFixed(0);
                          }
                          _syncSplitAmounts();
                        });
                      },
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: isCurrent ? const Color(0xFFFDF2F4) : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isCurrent ? const Color(0xFF800020) : const Color(0xFFE2E8F0),
                            width: isCurrent ? 1.5 : 1.0,
                          ),
                          boxShadow: const [
                            BoxShadow(
                              color: Color(0x060F172A),
                              blurRadius: 4,
                              offset: Offset(0, 1.5),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    pkg['PackageName'] ?? 'Package',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF800020),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    '₹${total.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 12.5,
                                      fontWeight: FontWeight.w800,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF1F5F9),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(Icons.propane_tank_rounded, size: 12, color: Color(0xFF475569)),
                                      const SizedBox(width: 4),
                                      Text(
                                        cylName,
                                        style: GoogleFonts.inter(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFF334155),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (items.isNotEmpty) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2.5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: Text(
                                      '+${items.length} Accessories',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: const Color(0xFF64748B),
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ================= 3. PAYMENT METHOD SECTION (Matches Delivery UI Tabs & Split Bar) =================
  Widget _buildPaymentSection(double totalAmount) {
    final modes = [
      {'key': 'Cash', 'title': 'Cash', 'icon': Icons.payments_outlined},
      {'key': 'UPI', 'title': 'Bank', 'icon': Icons.qr_code_2_rounded},
      {'key': 'Split', 'title': 'Split', 'icon': Icons.call_split_rounded},
    ];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x060F172A),
            blurRadius: 4,
            offset: Offset(0, 1.5),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
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

          // Payment Option Tabs (Identical to Delivery UI)
          Row(
            children: modes.map((m) {
              final isSel = _paymentMode == m['key'];
              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    setState(() {
                      _paymentMode = m['key'] as String;
                      if (_paymentMode == 'Cash' && totalAmount > 0) {
                        _cashController.text = totalAmount.toStringAsFixed(0);
                        _upiController.text = '0';
                      } else if (_paymentMode == 'UPI' && totalAmount > 0) {
                        _cashController.text = '0';
                        _upiController.text = totalAmount.toStringAsFixed(0);
                      }
                      _syncSplitAmounts();
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    margin: EdgeInsets.only(right: m['key'] != 'Split' ? 8 : 0),
                    padding: const EdgeInsets.symmetric(vertical: 11),
                    decoration: BoxDecoration(
                      color: isSel ? const Color(0xFFFDF2F4) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: isSel ? const Color(0xFF800020) : const Color(0xFFE2E8F0),
                        width: isSel ? 1.5 : 1,
                      ),
                      boxShadow: isSel
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
                          color: isSel ? const Color(0xFF800020) : const Color(0xFF64748B),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          m['title'] as String,
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
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

          // Split Payment Amounts Container (Matches Delivery UI Split Bar)
          if (_paymentMode == 'Split') ...[
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
                      if (totalAmount > 0)
                        Text(
                          'Total: \u20B9${totalAmount.toStringAsFixed(0)}',
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
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF475569),
                              ),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _cashController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0F172A),
                              ),
                              decoration: InputDecoration(
                                hintText: '0',
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5),
                                ),
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
                            Text(
                              'Bank / UPI (\u20B9)',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF475569),
                              ),
                            ),
                            const SizedBox(height: 4),
                            TextField(
                              controller: _upiController,
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0F172A),
                              ),
                              decoration: InputDecoration(
                                hintText: '0',
                                filled: true,
                                fillColor: Colors.white,
                                contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(8),
                                  borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5),
                                ),
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
              ),
            ),
          ],
        ],
      ),
    );
  }
}
