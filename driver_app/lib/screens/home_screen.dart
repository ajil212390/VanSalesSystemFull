import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import '../widgets/app_theme.dart';
import '../widgets/smooth_transitions.dart';
import 'home_shell.dart';
import 'profile_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {

  bool get _isDark => AppStateProvider.of(context).isDarkMode;
  Color get _scaffoldBg => AppTheme.scaffoldBg(_isDark);
  Color get _innerBoxBg => AppTheme.innerBoxBg(_isDark);
  Color get _textPrimary => AppTheme.textPrimary(_isDark);
  BoxDecoration _cardDecor([double radius = 16, Color? borderColor, Color? customColor]) =>
      AppTheme.glassCardDecoration(_isDark, radius: radius, borderColor: borderColor, customColor: customColor);

  bool _inventoryOpenInFirstCard = false;
  bool _incomeExpanded = false;
  bool _expenseExpanded = false;
  bool _balanceExpanded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        AppStateProvider.of(context).syncFromBackend();
      }
    });
  }

  String _getFormattedDate() {
    final now = DateTime.now();
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${now.day.toString().padLeft(2, '0')} ${months[now.month - 1]} ${now.year}';
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);

    return Scaffold(
      backgroundColor: _scaffoldBg,
      body: SafeArea(
        child: RefreshIndicator(
          color: const Color(0xFF800020),
          backgroundColor: _isDark ? const Color(0xFF1E293B) : Colors.white,
          onRefresh: () async {
            await state.syncFromBackend();
            await Future.delayed(const Duration(milliseconds: 300));
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(
              parent: BouncingScrollPhysics(),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
              // 1. DRIVER PROFILE & ALLOCATED VEHICLE CARD
              _buildDriverProfileCard(context, state),

              const SizedBox(height: 12),

              // 2. START NEW DELIVERY ACTION (Just above Stock Overview)
              _buildStartDeliveryButton(context, state),

              const SizedBox(height: 12),

              // 3. DAILY STOCK METRICS & INVENTORY CARD (with Inventory toggle)
              _buildStockSummaryCard(context, state),

              const SizedBox(height: 12),

              // 4. INCOME SECTION (Dropdown to Cash & Bank)
              _buildIncomeSection(context, state),

              const SizedBox(height: 12),

              // 5. EXPENSES SECTION (Dropdown + Add & History Buttons)
              _buildExpenseSection(context, state),

              const SizedBox(height: 12),

              // 6. BALANCE SECTION (Dropdown to Cash in Hand & Bank Net)
              _buildBalanceSection(context, state),

              const SizedBox(height: 90),
            ],
          ),
        ),
      ),
    ),
  );
}

  // ================= 1. DRIVER PROFILE & VEHICLE CARD =================
  Widget _buildDriverProfileCard(BuildContext context, AppState state) {
    final avatarInitials = state.driverName.trim().isNotEmpty
        ? (state.driverName.trim().length >= 2
            ? state.driverName.trim().substring(0, 2).toUpperCase()
            : state.driverName.trim().toUpperCase())
        : 'AR';

    return Container(
      width: double.infinity,
      decoration: _cardDecor(16),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Driver Profile Row (Avatar, Name + Status, Date Badge)
          Row(
            children: [
              // Avatar
              InkWell(
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                onTap: () {
                  Navigator.push(
                    context,
                    SmoothPageRoute(page: const ProfileScreen()),
                  );
                },
                borderRadius: BorderRadius.circular(22),
                child: Container(
                  width: 44,
                  height: 44,
                  decoration: const BoxDecoration(
                    color: Color(0xFF800020),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      avatarInitials,
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),

              // Driver Name & Status Badge
              Expanded(
                child: InkWell(
                  splashColor: Colors.transparent,
                  highlightColor: Colors.transparent,
                  onTap: () {
                    Navigator.push(
                      context,
                      SmoothPageRoute(page: const ProfileScreen()),
                    );
                  },
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        state.driverName,
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: _textPrimary,
                          letterSpacing: -0.3,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'On Duty • Driver',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Date Badge (Clean border pill)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5.5),
                decoration: BoxDecoration(
                  color: _isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.calendar_today_outlined, size: 11.5, color: Color(0xFF800020)),
                    const SizedBox(width: 5),
                    Text(
                      _getFormattedDate(),
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: _isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 2. Dual Structured Badges: Vehicle Card + Route Card
          Row(
            children: [
              // Vehicle Badge
              Expanded(
                flex: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: _innerBoxBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.local_shipping_rounded,
                        size: 16,
                        color: Color(0xFF800020),
                      ),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'VEHICLE',
                              style: GoogleFonts.inter(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF94A3B8),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              state.vehicleNumber,
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w800,
                                color: _textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Route Badge
              Expanded(
                flex: 5,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: _innerBoxBg,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.alt_route_rounded,
                        size: 16,
                        color: Color(0xFF800020),
                      ),
                      const SizedBox(width: 7),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'ROUTE',
                              style: GoogleFonts.inter(
                                fontSize: 9,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF94A3B8),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(height: 1),
                            _MarqueeText(
                              text: state.routeInfo,
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: _textPrimary,
                              ),
                            ),
                          ],
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
    );
  }

  // ================= 2. DAILY STOCK METRICS & INVENTORY CARD =================
  Widget _buildStockSummaryCard(BuildContext context, AppState state) {
    final totalStarting = state.totalStartingFilled + state.totalStartingEmpty;
    final totalDelivered = state.totalDeliveredFilled;
    final totalClosing = state.totalClosingFilled;
    final deliveryPercent = totalStarting > 0
        ? (totalDelivered / totalStarting).clamp(0.0, 1.0)
        : 0.0;

    return Container(
      width: double.infinity,
      decoration: _cardDecor(20),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Header: Stock Overview + 0% delivered pill (No icon)
          Row(
            children: [
              Text(
                'Stock Overview',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: _textPrimary,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: _isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${(deliveryPercent * 100).toInt()}% delivered',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // 2. Top Row Box: Allocated | Empty | Others (Compact)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
            decoration: BoxDecoration(
              color: _isDark ? const Color(0xFF1E293B) : const Color(0xFFFAFAFA),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                // Allocated
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${state.totalStartingFilled}',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: _textPrimary,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Allocated',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),

                // Vertical Divider
                Container(
                  height: 28,
                  width: 1,
                  color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                ),

                // Empty
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${state.totalStartingEmpty}',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: _textPrimary,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Empty',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),

                // Vertical Divider
                Container(
                  height: 28,
                  width: 1,
                  color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                ),

                // Others
                Expanded(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${state.totalOtherStock}',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                          color: _textPrimary,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Others',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // 3. Two Compact Cards: Delivered & Balance
          Row(
            children: [
              // Delivered Card (Grey section)
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                  decoration: BoxDecoration(
                    color: _isDark
                        ? const Color(0xFF1E293B)
                        : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _isDark
                          ? const Color(0xFF334155)
                          : const Color(0xFFE2E8F0),
                      width: 1.2,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$totalDelivered',
                        style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: _textPrimary,
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Delivered',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${state.totalDeliveredEmpty}',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: _isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
                            ),
                          ),
                          const SizedBox(width: 3.5),
                          Text(
                            'empty returned',
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
              ),

              const SizedBox(width: 10),

              // Balance Card (Burgundy)
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                  decoration: BoxDecoration(
                    color: _isDark
                        ? const Color(0xFF7F1D1D).withValues(alpha: 0.25)
                        : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _isDark
                          ? const Color(0xFF800020)
                          : const Color(0xFFFEE2E2),
                      width: 1.2,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$totalClosing',
                        style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF800020),
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Balance',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF800020),
                        ),
                      ),
                      const SizedBox(height: 3),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${state.totalClosingEmpty}',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF800020),
                            ),
                          ),
                          const SizedBox(width: 3.5),
                          Text(
                            'empty returned',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                              color: const Color(0xFF800020),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // 4. View Details toggle
          InkWell(
            splashColor: Colors.transparent,
            highlightColor: Colors.transparent,
            onTap: () {
              setState(() {
                _inventoryOpenInFirstCard = !_inventoryOpenInFirstCard;
              });
            },
            borderRadius: BorderRadius.circular(8),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _inventoryOpenInFirstCard ? 'Hide details' : 'View details',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF800020),
                    ),
                  ),
                  const SizedBox(width: 4),
                  AnimatedRotation(
                    turns: _inventoryOpenInFirstCard ? 0.5 : 0.0,
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOutCubic,
                    child: const Icon(
                      Icons.keyboard_arrow_down_rounded,
                      size: 18,
                      color: Color(0xFF800020),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // 5. Inventory Table (Smooth Butter AnimatedCrossFade)
          ClipRect(
            child: AnimatedCrossFade(
              firstChild: const SizedBox(width: double.infinity, height: 0),
              secondChild: Column(
                children: [
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    height: 1,
                    color: _isDark ? const Color(0xFF334155) : const Color(0xFFF1F5F9),
                  ),
                  const SizedBox(height: 10),
                  _buildInventoryTable(state),
                ],
              ),
              crossFadeState: _inventoryOpenInFirstCard
                  ? CrossFadeState.showSecond
                  : CrossFadeState.showFirst,
              duration: const Duration(milliseconds: 320),
              firstCurve: Curves.easeInOutCubic,
              secondCurve: Curves.easeInOutCubic,
              sizeCurve: Curves.easeInOutCubic,
            ),
          ),
        ],
      ),
    );
  }

  // ================= 3. INCOME SECTION (DROPDOWN TO CASH & UPI) =================
  Widget _buildIncomeSection(BuildContext context, AppState state) {
    return Container(
      width: double.infinity,
      decoration: _cardDecor(16),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
          onTap: () {
            setState(() {
              _incomeExpanded = !_incomeExpanded;
            });
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header Row & Dropdown Indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.payments_rounded, size: 16, color: _textPrimary),
                        const SizedBox(width: 6),
                        Text(
                          'INCOME (TOTAL COLLECTED)',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: _textPrimary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    AnimatedRotation(
                      turns: _incomeExpanded ? 0.5 : 0.0,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOutCubic,
                      child: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 20,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),

                // Prominent Hero Total Income Display
                Text(
                  '₹${state.totalIncome.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: _textPrimary,
                    letterSpacing: -0.4,
                  ),
                ),

                // Smooth Collapsible Cash & Bank Breakdown Boxes
                ClipRect(
                  child: AnimatedCrossFade(
                    firstChild: const SizedBox(width: double.infinity, height: 0),
                    secondChild: Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: _innerBoxBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.money_rounded, size: 13, color: _textPrimary),
                                      const SizedBox(width: 4),
                                      Text(
                                        'CASH',
                                        style: GoogleFonts.inter(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '₹${state.cashIncome.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                      color: _textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: _innerBoxBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.account_balance_rounded, size: 13, color: Color(0xFF0284C7)),
                                      const SizedBox(width: 4),
                                      Text(
                                        'BANK',
                                        style: GoogleFonts.inter(
                                          fontSize: 10.5,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '₹${state.bankIncome.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                      color: _textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    crossFadeState: _incomeExpanded
                        ? CrossFadeState.showSecond
                        : CrossFadeState.showFirst,
                    duration: const Duration(milliseconds: 320),
                    firstCurve: Curves.easeInOutCubic,
                    secondCurve: Curves.easeInOutCubic,
                    sizeCurve: Curves.easeInOutCubic,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ================= 4. EXPENSES SECTION (DROPDOWN + ADD & HISTORY BUTTONS) =================
  Widget _buildExpenseSection(BuildContext context, AppState state) {
    return Container(
      width: double.infinity,
      decoration: _cardDecor(16),
      child: Material(
        color: Colors.transparent,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row with Expand Toggle
              InkWell(
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                onTap: () {
                  setState(() {
                    _expenseExpanded = !_expenseExpanded;
                  });
                },
                borderRadius: BorderRadius.circular(8),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.receipt_long_rounded, size: 16, color: Color(0xFF800020)),
                        const SizedBox(width: 6),
                        Text(
                          'TRIP EXPENSES',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF800020),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    AnimatedRotation(
                      turns: _expenseExpanded ? 0.5 : 0.0,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOutCubic,
                      child: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 20,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 5),

              // Prominent Hero Total Expense Display
              InkWell(
                splashColor: Colors.transparent,
                highlightColor: Colors.transparent,
                onTap: () {
                  setState(() {
                    _expenseExpanded = !_expenseExpanded;
                  });
                },
                child: Text(
                  '₹${state.totalExpense.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF800020),
                    letterSpacing: -0.4,
                  ),
                ),
              ),

              // Smooth Collapsible Cash & Bank Expense Breakdown Boxes + Action Buttons
              ClipRect(
                child: AnimatedCrossFade(
                  firstChild: const SizedBox(width: double.infinity, height: 0),
                  secondChild: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: _innerBoxBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.money_rounded, size: 13, color: Color(0xFF800020)),
                                      const SizedBox(width: 4),
                                      Text(
                                        'CASH EXPENSE',
                                        style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '₹${state.cashExpense.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: const Color(0xFF800020)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: _innerBoxBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.account_balance_rounded, size: 13, color: Color(0xFF0284C7)),
                                      const SizedBox(width: 4),
                                      Text(
                                        'BANK EXPENSE',
                                        style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '₹${state.bankExpense.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: const Color(0xFFB45309)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Action Buttons Row: Left = "+ Add Expense", Right = "History"
                      Row(
                        children: [
                          // Left: + Add Expense Button
                          Expanded(
                            child: InkWell(
                              onTap: () => _openAddExpenseModal(context, state),
                              borderRadius: BorderRadius.circular(9),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 9.5),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF800020),
                                  borderRadius: BorderRadius.circular(9),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x28800020),
                                      blurRadius: 4,
                                      offset: Offset(0, 2),
                                    ),
                                  ],
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.add_rounded, size: 16, color: Colors.white),
                                    const SizedBox(width: 5),
                                    Text(
                                      'Add Expense',
                                      style: GoogleFonts.inter(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w800,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),

                          // Right: History Button
                          Expanded(
                            child: InkWell(
                              onTap: () => _openExpenseHistoryModal(context, state),
                              borderRadius: BorderRadius.circular(9),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 9.5),
                                decoration: BoxDecoration(
                                  color: _innerBoxBg,
                                  borderRadius: BorderRadius.circular(9),
                                  border: Border.all(color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                ),
                                child: Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(Icons.receipt_long_outlined, size: 15, color: _isDark ? const Color(0xFF94A3B8) : const Color(0xFF334155)),
                                    const SizedBox(width: 5),
                                    Text(
                                      'History',
                                      style: GoogleFonts.inter(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w800,
                                        color: _isDark ? const Color(0xFF94A3B8) : const Color(0xFF334155),
                                      ),
                                    ),
                                    if (state.expenses.isNotEmpty) ...[
                                      const SizedBox(width: 5),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                        decoration: BoxDecoration(
                                          color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Text(
                                          '${state.expenses.length}',
                                          style: GoogleFonts.inter(
                                            fontSize: 10,
                                            fontWeight: FontWeight.w800,
                                            color: _textPrimary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  crossFadeState: _expenseExpanded
                      ? CrossFadeState.showSecond
                      : CrossFadeState.showFirst,
                  duration: const Duration(milliseconds: 320),
                  firstCurve: Curves.easeInOutCubic,
                  secondCurve: Curves.easeInOutCubic,
                  sizeCurve: Curves.easeInOutCubic,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ================= 5. BALANCE SECTION (DROPDOWN TO CASH IN HAND & BANK NET) =================
  Widget _buildBalanceSection(BuildContext context, AppState state) {
    return Container(
      width: double.infinity,
      decoration: _cardDecor(16),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          splashColor: Colors.transparent,
          highlightColor: Colors.transparent,
          onTap: () {
            setState(() {
              _balanceExpanded = !_balanceExpanded;
            });
          },
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Section Title Row & Dropdown Indicator
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.account_balance_wallet_rounded, size: 16, color: _textPrimary),
                        const SizedBox(width: 6),
                        Text(
                          'BALANCE',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: _textPrimary,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    AnimatedRotation(
                      turns: _balanceExpanded ? 0.5 : 0.0,
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOutCubic,
                      child: const Icon(
                        Icons.keyboard_arrow_down_rounded,
                        size: 20,
                        color: Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),

                // Prominent Net Balance Display
                Text(
                  '₹${state.netBalance.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w700,
                    color: _textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),

                // Smooth Collapsible Cash in Hand & Bank Net Breakdown Boxes
                ClipRect(
                  child: AnimatedCrossFade(
                    firstChild: const SizedBox(width: double.infinity, height: 0),
                    secondChild: Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: _innerBoxBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Icon(Icons.money_rounded, size: 13, color: _textPrimary),
                                      const SizedBox(width: 4),
                                      Text(
                                        'CASH IN HAND',
                                        style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '₹${state.cashBalance.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: _textPrimary),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              decoration: BoxDecoration(
                                color: _innerBoxBg,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.account_balance_rounded, size: 13, color: Color(0xFF0284C7)),
                                      const SizedBox(width: 4),
                                      Text(
                                        'BANK NET',
                                        style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '₹${state.bankBalance.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: _textPrimary),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    crossFadeState: _balanceExpanded
                        ? CrossFadeState.showSecond
                        : CrossFadeState.showFirst,
                    duration: const Duration(milliseconds: 320),
                    firstCurve: Curves.easeInOutCubic,
                    secondCurve: Curves.easeInOutCubic,
                    sizeCurve: Curves.easeInOutCubic,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // --- CYLINDER INVENTORY TABLE (Inside First Card) ---
  Widget _buildInventoryTable(AppState state) {
    final totalAllocated = state.totalStartingFilled;
    final totalDelivered = state.totalDeliveredFilled;
    final totalBalance = state.totalClosingFilled;
    final totalEmpty = state.totalClosingEmpty;

    return Column(
      key: const ValueKey('first_card_inventory_table'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Table Header Row
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  'Weight',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Allo.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Del.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Bal.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  'Emp.',
                  textAlign: TextAlign.end,
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 2),

        // Table Rows
        ...state.cylinders.map((cyl) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7.5),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
            ),
            child: Row(
              children: [
                // Weight Column (Pill Container)
                Expanded(
                  flex: 3,
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        cyl.weight,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                          color: _textPrimary,
                        ),
                      ),
                    ),
                  ),
                ),

                // Allocated Column
                Expanded(
                  flex: 2,
                  child: Text(
                    '${cyl.initialFilledStock}',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ),

                // Delivered Column (Charcoal / Slate)
                Expanded(
                  flex: 2,
                  child: Text(
                    '${cyl.deliveredStock}',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      color: _isDark ? Colors.white : const Color(0xFF0F172A),
                    ),
                  ),
                ),

                // Balance Column (Burgundy)
                Expanded(
                  flex: 2,
                  child: Text(
                    '${cyl.filledStock}',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                    ),
                  ),
                ),

                // Empty Column
                Expanded(
                  flex: 2,
                  child: Text(
                    '${cyl.emptyStock}',
                    textAlign: TextAlign.end,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: _isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                    ),
                  ),
                ),
              ],
            ),
          );
        }),

        const SizedBox(height: 8),

        // Table Total Row (Separated with distinct styling, font size and colors)
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
          decoration: BoxDecoration(
            color: _isDark
                ? const Color(0xFF7F1D1D).withValues(alpha: 0.15)
                : const Color(0xFFFEF2F2),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: _isDark
                  ? const Color(0xFF800020).withValues(alpha: 0.35)
                  : const Color(0xFFFEE2E2),
              width: 1.2,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  'Total',
                  style: GoogleFonts.inter(
                    fontSize: 14.5,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF800020),
                    letterSpacing: 0.3,
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalAllocated',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: _isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalDelivered',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: _isDark ? const Color(0xFFE2E8F0) : const Color(0xFF0F172A),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalBalance',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF800020),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalEmpty',
                  textAlign: TextAlign.end,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    color: _isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ================= 6. START NEW DELIVERY BUTTON =================
  Widget _buildStartDeliveryButton(BuildContext context, AppState state) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [
            Color(0xFF5A0016), // Dark Burgundy
            Color(0xFF800020), // Primary Burgundy
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.18),
            blurRadius: 18,
            offset: const Offset(0, 8),
            spreadRadius: -2,
          ),
          BoxShadow(
            color: const Color(0xFF0F172A).withValues(alpha: 0.08),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            state.resetDelivery();
            HomeShell.switchTab(context, 1);
          },
          borderRadius: BorderRadius.circular(14),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            child: Row(
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.18),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: const Icon(Icons.add_rounded, color: Colors.white, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'START NEW DELIVERY',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: 0.4,
                        ),
                      ),
                      Text(
                        'Select customer & record cylinder drop',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w400,
                          color: const Color(0xFFFEE2E2),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 14),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ================= POPUP MODAL FOR EXPENSE HISTORY =================
  void _openExpenseHistoryModal(BuildContext context, AppState state) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.75,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(7),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.receipt_long_rounded, size: 18, color: Color(0xFF800020)),
                        ),
                        const SizedBox(width: 10),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Trip Expenses History',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: _textPrimary,
                              ),
                            ),
                            Text(
                              'Total spent: ₹${state.totalExpense.toStringAsFixed(0)} • ${state.expenses.length} records',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20, color: Color(0xFF64748B)),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: Color(0xFFF1F5F9)),

              // Expenses List
              if (state.expenses.isEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                  child: Column(
                    children: [
                      const Icon(Icons.receipt_outlined, size: 44, color: Color(0xFFCBD5E1)),
                      const SizedBox(height: 10),
                      Text(
                        'No trip expenses logged yet',
                        style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Tap "+ Add Expense" to record fuel, toll, or food.',
                        style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                )
              else
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: state.expenses.length,
                    separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                    itemBuilder: (context, index) {
                      final exp = state.expenses[index];
                      final isCash = exp.paymentMethod.toLowerCase() == 'cash';
                      final displayMethod = isCash ? 'CASH' : 'BANK';
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        child: Row(
                          children: [
                            // Payment Badge Icon
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: isCash ? const Color(0xFFFEF2F2) : const Color(0xFFF0F9FF),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(
                                isCash ? Icons.money_rounded : Icons.account_balance_rounded,
                                size: 18,
                                color: isCash ? const Color(0xFF800020) : const Color(0xFF0284C7),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Title and Method Pill
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    exp.title,
                                    style: GoogleFonts.inter(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w700,
                                      color: _textPrimary,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: isCash ? const Color(0xFFFEF2F2) : const Color(0xFFF0F9FF),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: Text(
                                      displayMethod,
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w800,
                                        color: isCash ? const Color(0xFF800020) : const Color(0xFF0284C7),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),

                            // Expense Amount
                            Text(
                              '₹${exp.amount.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: _textPrimary,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),

              // Bottom Action to Add Expense
              Padding(
                padding: const EdgeInsets.all(16),
                child: SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(ctx);
                      _openAddExpenseModal(context, state);
                    },
                    icon: const Icon(Icons.add, size: 16),
                    label: const Text('Add New Expense'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF800020),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      textStyle: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ================= SMALL POPUP MODAL TO ADD EXPENSE =================
  void _openAddExpenseModal(BuildContext context, AppState state) {
    final amountCtrl = TextEditingController();
    final noteCtrl = TextEditingController();
    String selectedMode = 'Bank'; // 'Cash' or 'Bank'
    String selectedCategory = 'Fuel Topup';

    final categories = ['Fuel Topup', 'Toll Plaza', 'Food / Tea', 'Parking', 'Maintenance', 'Other'];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (modalCtx, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                top: 18,
                left: 18,
                right: 18,
                bottom: MediaQuery.of(context).viewInsets.bottom + 20,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Add Trip Expense',
                          style: GoogleFonts.inter(
                            fontSize: 17,
                            fontWeight: FontWeight.w800,
                            color: _textPrimary,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20, color: Color(0xFF64748B)),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Amount Field
                    Text(
                      'Expense Amount (₹)',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: amountCtrl,
                      keyboardType: TextInputType.number,
                      autofocus: true,
                      style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: _textPrimary),
                      decoration: InputDecoration(
                        prefixIcon: const Icon(Icons.currency_rupee, size: 20, color: Color(0xFF800020)),
                        hintText: '0',
                        hintStyle: const TextStyle(color: Color(0xFFCBD5E1)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF800020))),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // Payment Mode Toggle (Cash / Bank)
                    Text(
                      'Paid Via',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => setModalState(() => selectedMode = 'Bank'),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: selectedMode == 'Bank' ? const Color(0xFFF0F9FF) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: selectedMode == 'Bank' ? const Color(0xFF0284C7) : const Color(0xFFE2E8F0),
                                  width: selectedMode == 'Bank' ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.account_balance_rounded, size: 16, color: selectedMode == 'Bank' ? const Color(0xFF0284C7) : const Color(0xFF64748B)),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Bank',
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: selectedMode == 'Bank' ? const Color(0xFF0284C7) : const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: InkWell(
                            onTap: () => setModalState(() => selectedMode = 'Cash'),
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              decoration: BoxDecoration(
                                color: selectedMode == 'Cash' ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: selectedMode == 'Cash' ? const Color(0xFF800020) : const Color(0xFFE2E8F0),
                                  width: selectedMode == 'Cash' ? 1.5 : 1,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.payments, size: 16, color: selectedMode == 'Cash' ? const Color(0xFF800020) : const Color(0xFF64748B)),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Cash',
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w800,
                                      color: selectedMode == 'Cash' ? const Color(0xFF800020) : const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Reason / Category Chips
                    Text(
                      'Expense Category / Reason',
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF475569)),
                    ),
                    const SizedBox(height: 6),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: categories.map((cat) {
                        final isSel = selectedCategory == cat;
                        return InkWell(
                          onTap: () => setModalState(() => selectedCategory = cat),
                          borderRadius: BorderRadius.circular(6),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                            decoration: BoxDecoration(
                              color: isSel ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              cat,
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: isSel ? Colors.white : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),

                    const SizedBox(height: 12),

                    // Optional Custom Note
                    TextField(
                      controller: noteCtrl,
                      style: GoogleFonts.inter(fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Add note (optional)...',
                        hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF800020))),
                      ),
                    ),

                    const SizedBox(height: 18),

                    // Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 46,
                      child: ElevatedButton(
                        onPressed: () {
                          final amt = double.tryParse(amountCtrl.text.trim()) ?? 0;
                          if (amt <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Please enter a valid amount')),
                            );
                            return;
                          }

                          final title = noteCtrl.text.trim().isNotEmpty
                              ? '$selectedCategory (${noteCtrl.text.trim()})'
                              : selectedCategory;

                          state.addExpense(
                            title: title,
                            amount: amt,
                            paymentMethod: selectedMode,
                          );

                          Navigator.pop(ctx);

                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Expense of ₹${amt.toStringAsFixed(0)} logged via $selectedMode.'),
                              backgroundColor: const Color(0xFF0F172A),
                              behavior: SnackBarBehavior.floating,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF800020),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          textStyle: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                        child: const Text('Save Expense'),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

/// A horizontally scrollable marquee text widget that automatically scrolls
/// long text smoothly and also allows user touch scrolling.
class _MarqueeText extends StatefulWidget {
  final String text;
  final TextStyle style;

  const _MarqueeText({
    required this.text,
    required this.style,
  });

  @override
  State<_MarqueeText> createState() => _MarqueeTextState();
}

class _MarqueeTextState extends State<_MarqueeText> {
  final ScrollController _scrollController = ScrollController();
  bool _isDisposed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _startScrolling());
  }

  void _startScrolling() async {
    while (!_isDisposed && mounted) {
      await Future.delayed(const Duration(seconds: 2));
      if (!_isDisposed && mounted && _scrollController.hasClients) {
        final maxScroll = _scrollController.position.maxScrollExtent;
        if (maxScroll > 0) {
          await _scrollController.animateTo(
            maxScroll,
            duration: Duration(milliseconds: (maxScroll * 35).toInt().clamp(1500, 6000)),
            curve: Curves.easeInOut,
          );
          await Future.delayed(const Duration(seconds: 1));
          if (!_isDisposed && mounted && _scrollController.hasClients) {
            await _scrollController.animateTo(
              0,
              duration: const Duration(milliseconds: 800),
              curve: Curves.easeOut,
            );
          }
        }
      }
      await Future.delayed(const Duration(seconds: 2));
    }
  }

  @override
  void dispose() {
    _isDisposed = true;
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      controller: _scrollController,
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      child: Text(
        widget.text,
        style: widget.style,
        maxLines: 1,
        softWrap: false,
      ),
    );
  }
}
