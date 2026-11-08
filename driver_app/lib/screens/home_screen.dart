import '../widgets/app_toast.dart';
import '../widgets/confirm_dialog.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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

  Timer? _liveSyncTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        AppStateProvider.of(context).syncFromBackend();
      }
    });
    // Live real-time sync every 8 seconds for instant stock updates
    _liveSyncTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      if (mounted && (ModalRoute.of(context)?.isCurrent ?? true)) {
        AppStateProvider.of(context).syncFromBackend();
      }
    });
  }

  @override
  void dispose() {
    _liveSyncTimer?.cancel();
    super.dispose();
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

              const SizedBox(height: 14),

              // 7. END SHIFT ACTION BUTTON (At bottom of balance section)
              _buildEndShiftButton(context, state),

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
              // Modern Unique Driver Profile Icon
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
                  child: const Center(
                    child: Icon(
                      Icons.person,
                      size: 26,
                      color: Colors.white,
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
                        'On Duty \u2022 Driver',
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
                // Allocated Cylinders
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
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 3.5),
                      Text(
                        'Cylinders',
                        style: GoogleFonts.inter(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                          height: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),

                // Vertical Divider
                Container(
                  height: 38,
                  width: 1,
                  color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                ),

                // Empty Cylinders
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
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 3.5),
                      Text(
                        'Cylinders',
                        style: GoogleFonts.inter(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                          height: 1.1,
                        ),
                      ),
                    ],
                  ),
                ),

                // Vertical Divider
                Container(
                  height: 38,
                  width: 1,
                  color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                ),

                // Other Products
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
                        'Other',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 3.5),
                      Text(
                        'Products',
                        style: GoogleFonts.inter(
                          fontSize: 10.5,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                          height: 1.1,
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
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 4.5),
                      Text(
                        'Cylinders',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF64748B),
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 4),
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
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 4.5),
                      Text(
                        'Cylinders',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: const Color(0xFF800020),
                          height: 1.1,
                        ),
                      ),
                      const SizedBox(height: 4),
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
                  '\u20B9${state.totalIncome.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: _textPrimary,
                    letterSpacing: -0.5,
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
                                    '\u20B9${state.cashIncome.toStringAsFixed(0)}',
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
                                    '\u20B9${state.bankIncome.toStringAsFixed(0)}',
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
                  '\u20B9${state.totalExpense.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF800020),
                    letterSpacing: -0.5,
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
                                    '\u20B9${state.cashExpense.toStringAsFixed(0)}',
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
                                    '\u20B9${state.bankExpense.toStringAsFixed(0)}',
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
                  '\u20B9${state.netBalance.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
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
                                    '\u20B9${state.cashBalance.toStringAsFixed(0)}',
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
                                    '\u20B9${state.bankBalance.toStringAsFixed(0)}',
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


  // ================= 7. END SHIFT ACTION BUTTON =================
  Widget _buildEndShiftButton(BuildContext context, AppState state) {
    final bool isSettled = state.endShiftStatus.toUpperCase() == 'SETTLED';
    if (isSettled) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFBBF7D0)),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Color(0xFFDCFCE7),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.check_circle_rounded, color: Color(0xFF16A34A), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SHIFT SETTLED & APPROVED',
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF15803D),
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'All data reset to 0. Awaiting next Delivery Note allocation.',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF166534),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    final bool isPending = state.endShiftStatus.toUpperCase() == 'PENDING';
    if (isPending) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFFFDF2F4),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFF5C2CB), width: 1.2),
        ),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: const BoxDecoration(
                color: Color(0xFFF5C2CB),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.schedule_rounded, color: Color(0xFF800020), size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SHIFT END SUBMITTED',
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Awaiting Godown Admin verification and settlement approval.',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF475569),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }
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
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C0F172A),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _showEndShiftPreviewModal(context, state),
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
                  child: const Icon(Icons.assignment_return_rounded, color: Colors.white, size: 21),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'END SHIFT',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: 0.4,
                        ),
                      ),
                      Text(
                        'Review remaining stock & Receipt Note',
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

  // ================= END SHIFT PREVIEW & VERIFICATION MODAL =================
  void _showQuickEditInModal(BuildContext context, AppState state, DeliveryOrder order, VoidCallback onUpdated) {
    final amountController = TextEditingController(text: order.amount.toStringAsFixed(0));
    String selectedMethod = order.paymentMethod;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          contentPadding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: const Color(0xFFFDF2F4),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.edit_note_rounded, color: Color(0xFF800020), size: 20),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Edit Collection Amount',
                      style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                    ),
                    Text(
                      order.customer.name,
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: const Color(0xFF64748B)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Ticket ID', style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF64748B))),
                    Text(order.ticketId, style: GoogleFonts.jetBrainsMono(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF334155))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'COLLECTED AMOUNT (\u20B9)',
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF475569), letterSpacing: 0.4),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                cursorColor: const Color(0xFF800020),
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                decoration: InputDecoration(
                  prefixText: '\u20B9 ',
                  prefixStyle: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: const Color(0xFF800020)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5)),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'PAYMENT METHOD',
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFF475569), letterSpacing: 0.4),
              ),
              const SizedBox(height: 6),
              Row(
                children: ['Cash', 'UPI', 'Credit'].map((m) {
                  final sel = selectedMethod.toLowerCase() == m.toLowerCase();
                  return Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: InkWell(
                        onTap: () => setDialogState(() => selectedMethod = m),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          height: 38,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: sel ? const Color(0xFF800020) : Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: sel ? const Color(0xFF800020) : const Color(0xFFCBD5E1),
                              width: 1.2,
                            ),
                          ),
                          child: Text(
                            m,
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: sel ? FontWeight.w800 : FontWeight.w600,
                              color: sel ? Colors.white : const Color(0xFF334155),
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
          actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          actions: [
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
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
                  child: ElevatedButton(
                    onPressed: () async {
                      final amt = double.tryParse(amountController.text.trim()) ?? order.amount;
                      await state.updateOrderAmount(order.ticketId, amt, newPaymentMethod: selectedMethod);
                      onUpdated();
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF800020),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      elevation: 0,
                    ),
                    child: Text(
                      'Update',
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white),
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

  void _showEndShiftPreviewModal(BuildContext context, AppState state) {
    bool isSubmitting = false;
    bool showDeliveriesList = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final availableOther = state.otherProducts.where((p) {
              return p.balanceStock > 0 || p.initialStock > 0;
            }).toList();

            return Container(
              constraints: BoxConstraints(
                maxHeight: MediaQuery.of(context).size.height * 0.88,
              ),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Center Drag Handle
                  const SizedBox(height: 12),
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFCBD5E1),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),

                  // Header
                  Padding(
                    padding: const EdgeInsets.fromLTRB(20, 14, 16, 12),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF800020).withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(
                                Icons.warehouse_rounded,
                                size: 20,
                                color: Color(0xFF800020),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'End Shift Summary',
                                  style: GoogleFonts.inter(
                                    fontSize: 17,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                    letterSpacing: -0.3,
                                  ),
                                ),
                                Text(
                                  'Inbound Receipt Note to Central Godown',
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
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                  ),

                  const Divider(height: 1, color: Color(0xFFF1F5F9)),

                  // Scrollable Content
                  Flexible(
                    child: SingleChildScrollView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // 1. Shift KPI Metrics Card (Interactive - Tap to expand deliveries list)
                          InkWell(
                            onTap: () {
                              setModalState(() => showDeliveriesList = !showDeliveriesList);
                            },
                            borderRadius: BorderRadius.circular(12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(
                                  color: showDeliveriesList ? const Color(0xFF800020) : const Color(0xFFE2E8F0),
                                  width: showDeliveriesList ? 1.5 : 1.0,
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'DELIVERIES',
                                              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF64748B)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${state.orders.length} Drops',
                                              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(width: 1, height: 28, color: const Color(0xFFE2E8F0)),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'CASH IN HAND',
                                              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF64748B)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '\u20B9${state.cashBalance.toStringAsFixed(0)}',
                                              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF800020)),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Container(width: 1, height: 28, color: const Color(0xFFE2E8F0)),
                                      const SizedBox(width: 10),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'BANK / UPI',
                                              style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w800, color: const Color(0xFF64748B)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '\u20B9${state.bankBalance.toStringAsFixed(0)}',
                                              style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Text(
                                        showDeliveriesList ? 'Hide Today\'s Deliveries' : 'Tap to inspect or edit today\'s deliveries',
                                        style: GoogleFonts.inter(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w700,
                                          color: const Color(0xFF800020),
                                        ),
                                      ),
                                      const SizedBox(width: 4),
                                      Icon(
                                        showDeliveriesList ? Icons.expand_less_rounded : Icons.expand_more_rounded,
                                        size: 16,
                                        color: const Color(0xFF800020),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),

                          // Expandable Deliveries Breakdown
                          if (showDeliveriesList) ...[
                            const SizedBox(height: 10),
                            Container(
                              width: double.infinity,
                              constraints: const BoxConstraints(maxHeight: 260),
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                              ),
                              child: state.orders.isEmpty
                                  ? Center(
                                      child: Text(
                                        'No deliveries recorded today',
                                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
                                      ),
                                    )
                                  : ListView.separated(
                                      shrinkWrap: true,
                                      physics: const BouncingScrollPhysics(),
                                      itemCount: state.orders.length,
                                      separatorBuilder: (_, index) => const SizedBox(height: 6),
                                      itemBuilder: (context, idx) {
                                        final ord = state.orders[idx];
                                        return Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                          decoration: BoxDecoration(
                                            color: Colors.white,
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: const Color(0xFFE2E8F0)),
                                          ),
                                          child: Row(
                                            children: [
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      ord.customer.name,
                                                      style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                                      maxLines: 1,
                                                      overflow: TextOverflow.ellipsis,
                                                    ),
                                                    Text(
                                                      '${ord.ticketId} • ${ord.totalCylinders} Delivered, ${ord.totalEmpties} Empty',
                                                      style: GoogleFonts.inter(fontSize: 10.5, fontWeight: FontWeight.w500, color: const Color(0xFF64748B)),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.end,
                                                children: [
                                                  Text(
                                                    '\u20B9${ord.amount.toStringAsFixed(0)}',
                                                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w800, color: const Color(0xFF800020)),
                                                  ),
                                                  Text(
                                                    ord.paymentMethod.toUpperCase(),
                                                    style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, color: const Color(0xFF64748B)),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(width: 8),
                                              InkWell(
                                                onTap: () {
                                                  _showQuickEditInModal(context, state, ord, () => setModalState(() {}));
                                                },
                                                child: Container(
                                                  padding: const EdgeInsets.all(5),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFF1F5F9),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: const Icon(Icons.edit_outlined, size: 14, color: Color(0xFF475569)),
                                                ),
                                              ),
                                            ],
                                          ),
                                        );
                                      },
                                    ),
                            ),
                          ],

                          const SizedBox(height: 16),

                          // 2. CYLINDERS TO RETURN (Identical to Delivery Screen Table)
                          Container(
                            width: double.infinity,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
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
                                      'CYLINDERS TO RETURN',
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

                                // Column Headers: Weight | Full Cyls | Empty Return
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
                                          'Full Cyl',
                                          textAlign: TextAlign.center,
                                          style: GoogleFonts.inter(
                                            fontSize: 12,
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

                                // Cylinder Rows (Read-only Verification)
                                ...state.cylinders.map((cyl) {
                                  final filledVal = cyl.filledStock;
                                  final emptyVal = cyl.emptyStock;

                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                                    decoration: const BoxDecoration(
                                      border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        // Weight Chip
                                        Expanded(
                                          flex: 3,
                                          child: Align(
                                            alignment: Alignment.centerLeft,
                                            child: Container(
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
                                          ),
                                        ),

                                        // Full Cylinders Read-only Display
                                        Expanded(
                                          flex: 4,
                                          child: Center(
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                              decoration: BoxDecoration(
                                                color: filledVal > 0 ? const Color(0xFF800020).withValues(alpha: 0.08) : const Color(0xFFF8FAFC),
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(
                                                  color: filledVal > 0 ? const Color(0xFF800020).withValues(alpha: 0.25) : const Color(0xFFE2E8F0),
                                                ),
                                              ),
                                              child: Text(
                                                '$filledVal Full',
                                                style: GoogleFonts.inter(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w800,
                                                  color: filledVal > 0 ? const Color(0xFF800020) : const Color(0xFF64748B),
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),

                                        // Empty Return Read-only Display
                                        Expanded(
                                          flex: 4,
                                          child: Center(
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                              decoration: BoxDecoration(
                                                color: emptyVal > 0 ? const Color(0xFF0F172A).withValues(alpha: 0.06) : const Color(0xFFF8FAFC),
                                                borderRadius: BorderRadius.circular(8),
                                                border: Border.all(
                                                  color: emptyVal > 0 ? const Color(0xFF0F172A).withValues(alpha: 0.2) : const Color(0xFFE2E8F0),
                                                ),
                                              ),
                                              child: Text(
                                                '$emptyVal Empties',
                                                style: GoogleFonts.inter(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.w800,
                                                  color: emptyVal > 0 ? const Color(0xFF0F172A) : const Color(0xFF64748B),
                                                ),
                                              ),
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

                          // 3. OTHER PRODUCTS TO RETURN (Identical to Delivery Screen Table)
                          if (availableOther.isNotEmpty) ...[
                            const SizedBox(height: 14),
                            Container(
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Section Header
                                  Row(
                                    children: [
                                      const Icon(Icons.category_rounded, size: 18, color: Color(0xFF800020)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'OTHER PRODUCTS TO RETURN',
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

                                  // Column Headers: Product | Return Qty
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
                                            'Return Qty',
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

                                  // Product Rows (Read-only Verification)
                                  ...availableOther.map((prod) {
                                    final balVal = prod.balanceStock;

                                    return Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                                      decoration: const BoxDecoration(
                                        border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          // Product Chip
                                          Expanded(
                                            flex: 3,
                                            child: Align(
                                              alignment: Alignment.centerLeft,
                                              child: Container(
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
                                            ),
                                          ),

                                          // Return Qty Read-only Display
                                          Expanded(
                                            flex: 4,
                                            child: Center(
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                                                decoration: BoxDecoration(
                                                  color: balVal > 0 ? const Color(0xFF800020).withValues(alpha: 0.08) : const Color(0xFFF8FAFC),
                                                  borderRadius: BorderRadius.circular(8),
                                                  border: Border.all(
                                                    color: balVal > 0 ? const Color(0xFF800020).withValues(alpha: 0.25) : const Color(0xFFE2E8F0),
                                                  ),
                                                ),
                                                child: Text(
                                                  '$balVal Units',
                                                  style: GoogleFonts.inter(
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w800,
                                                    color: balVal > 0 ? const Color(0xFF800020) : const Color(0xFF64748B),
                                                  ),
                                                ),
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
                          ],
                        ],
                      ),
                    ),
                  ),

                  // Bottom Action: Confirm and Submit Receipt Note (NO GLOW, clean & crisp)
                  Container(
                    padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + MediaQuery.of(ctx).padding.bottom),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                    ),
                    child: SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF5A0016), Color(0xFF800020)],
                          ),
                        ),
                        child: Material(
                          color: Colors.transparent,
                          child: InkWell(
                            onTap: isSubmitting
                                ? null
                                : () async {
                                    setModalState(() => isSubmitting = true);

                                    // Build payload directly from current state balances (read-only verification)
                                    final remCyl = state.cylinders.map((c) => {
                                      'product_id': c.productId,
                                      'weight': c.weight,
                                      'qty': c.filledStock,
                                      'empty_qty': c.emptyStock,
                                    }).toList();

                                    final remOther = state.otherProducts.map((p) => {
                                      'product_id': p.productId,
                                      'name': p.name,
                                      'qty': p.balanceStock,
                                    }).toList();

                                    final res = await state.submitEndShift(
                                      remainingCylinders: remCyl,
                                      remainingOther: remOther,
                                    );

                                    if (ctx.mounted) {
                                      Navigator.pop(ctx);
                                    }

                                    if (context.mounted) {
                                      if (res['success'] == true) {
                                        final rn = res['receipt_no'] ?? res['settlement_id'] ?? 'ERD-${res['settlement_id'] ?? 'PENDING'}';
                                        _showEndShiftSuccessAlert(
                                          context: context,
                                          receiptNo: rn.toString(),
                                          cash: state.cashBalance,
                                          bank: state.bankBalance,
                                          filledReturns: state.totalClosingFilled,
                                          emptyReturns: state.totalClosingEmpty,
                                        );
                                      } else {
                                        AppToast.error(context, res['message'] ?? 'Could not submit End Shift. Please try again.');
                                      }
                                    }
                                  },
                            borderRadius: BorderRadius.circular(12),
                            child: Center(
                              child: isSubmitting
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2.2,
                                        valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                      ),
                                    )
                                  : Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        const Icon(Icons.check_circle_rounded, color: Colors.white, size: 18),
                                        const SizedBox(width: 8),
                                        Text(
                                          'CONFIRM & SUBMIT END SHIFT',
                                          style: GoogleFonts.inter(
                                            fontSize: 13.5,
                                            fontWeight: FontWeight.w800,
                                            color: Colors.white,
                                            letterSpacing: 0.4,
                                          ),
                                        ),
                                      ],
                                    ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }


  // --- INVENTORY BREAKDOWN TABLE (Inside First Card) ---
  Widget _buildInventoryTable(AppState state) {
    // Show only cylinders that are allocated or active
    final displayCylinders = state.cylinders.where((c) =>
      c.initialFilledStock > 0 || c.deliveredStock > 0 || c.filledStock > 0 || c.emptyStock > 0
    ).toList();

    // Show only other products that are allocated to this vehicle
    final displayOtherProducts = state.otherProducts.where((p) =>
      p.initialStock > 0 || p.balanceStock > 0 || p.deliveredStock > 0
    ).toList();

    final totalCylAllocated = state.totalStartingFilled;
    final totalCylDelivered = state.totalDeliveredFilled;
    final totalCylBalance = state.totalClosingFilled;
    final totalCylEmpty = state.totalClosingEmpty;

    final totalOtherAllo = state.totalOtherStock;
    final totalOtherDel = state.totalOtherDelivered;
    final totalOtherBal = state.totalOtherBalance;


    return Column(
      key: const ValueKey('first_card_inventory_table'),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // ================= SECTION 1: CYLINDERS =================
        Padding(
          padding: const EdgeInsets.only(top: 4, bottom: 8),
          child: Row(
            children: [
              Container(
                width: 3.5,
                height: 14,
                decoration: BoxDecoration(
                  color: const Color(0xFF800020),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'CYLINDERS',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF800020),
                  letterSpacing: 0.6,
                ),
              ),
              
            ],
          ),
        ),

        // Cylinder Table Header Row
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

        // Cylinder Rows
        ...displayCylinders.map((cyl) {
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

        // Dedicated Separate Total Row for Cylinders
        Container(
          margin: const EdgeInsets.only(top: 5),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7.5),
          decoration: BoxDecoration(
            color: _isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  'Total',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalCylAllocated',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalCylDelivered',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: _isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalCylBalance',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalCylEmpty',
                  textAlign: TextAlign.end,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: _isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                  ),
                ),
              ),
            ],
          ),
        ),

        // ================= SECTION 2: OTHER PRODUCTS =================
        if (displayOtherProducts.isNotEmpty) ...[
          const SizedBox(height: 18),
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Container(
                  width: 3.5,
                  height: 14,
                  decoration: BoxDecoration(
                    color: const Color(0xFF800020),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                const SizedBox(width: 8),
                Text(
                  'OTHER PRODUCTS',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                    letterSpacing: 0.6,
                  ),
                ),
                
              ],
            ),
          ),

          // Other Products Table Header Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Text(
                    'Product',
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

        // Other Product Rows (Allocated products only)
        ...displayOtherProducts.map((prod) {
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 7.5),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
            ),
            child: Row(
              children: [
                // Product Name Column (Display Name)
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
                        prod.name,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                          color: _textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                ),

                // Allocated Column
                Expanded(
                  flex: 2,
                  child: Text(
                    '${prod.initialStock}',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ),

                // Delivered Column
                Expanded(
                  flex: 2,
                  child: Text(
                    '${prod.deliveredStock}',
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
                    '${prod.balanceStock}',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                    ),
                  ),
                ),

                // Empty Column (Dash)
                Expanded(
                  flex: 2,
                  child: Text(
                    '\u2014',
                    textAlign: TextAlign.end,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF94A3B8),
                    ),
                  ),
                ),
              ],
            ),
          );
        }),

        // Dedicated Separate Total Row for Other Products
        Container(
          margin: const EdgeInsets.only(top: 5),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7.5),
          decoration: BoxDecoration(
            color: _isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Text(
                  'Total',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalOtherAllo',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalOtherDel',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: _isDark ? Colors.white : const Color(0xFF0F172A),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '$totalOtherBal',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF800020),
                  ),
                ),
              ),
              Expanded(
                flex: 2,
                child: Text(
                  '\u2014',
                  textAlign: TextAlign.end,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF94A3B8),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
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
        return AnimatedBuilder(
          animation: state,
          builder: (context, _) {
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
                                  'Total spent: \u20B9${state.totalExpense.toStringAsFixed(0)} \u2022 ${state.expenses.length} records',
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
                                  '\u20B9${exp.amount.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: _textPrimary,
                                  ),
                                ),

                                // Delete Expense Action
                                if (!state.isShiftLocked) ...[
                                  const SizedBox(width: 10),
                                  InkWell(
                                    onTap: () async {
                                      HapticFeedback.mediumImpact();
                                      final confirm = await showSuperGasConfirmDialog(
                                        context: ctx,
                                        title: 'Delete Expense?',
                                        message: 'Are you sure you want to delete "${exp.title}" (\u20B9${exp.amount.toStringAsFixed(0)})?\nThis will reverse the trip expense in accounts.',
                                        confirmLabel: 'Delete Expense',
                                        cancelLabel: 'Cancel',
                                        icon: Icons.delete_outline_rounded,
                                        iconColor: const Color(0xFF800020),
                                        iconBgColor: const Color(0xFFFDF2F4),
                                        confirmButtonColor: const Color(0xFF800020),
                                      );
                                      if (confirm == true) {
                                        state.deleteExpense(exp.id);
                                        if (context.mounted) {
                                          AppToast.success(context, 'Expense deleted');
                                        }
                                      }
                                    },
                                    borderRadius: BorderRadius.circular(8),
                                    child: Container(
                                      padding: const EdgeInsets.all(7),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFDF2F4),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: const Color(0xFFF5C2CB), width: 0.8),
                                      ),
                                      child: const Icon(
                                        Icons.delete_outline_rounded,
                                        size: 16,
                                        color: Color(0xFF800020),
                                      ),
                                    ),
                                  ),
                                ],
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
                      'Expense Amount (\u20B9)',
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
                            AppToast.warning(context, 'Please enter a valid amount');
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

                          AppToast.success(
                            context,
                            'Expense of \u20B9${amt.toStringAsFixed(0)} logged via $selectedMode.',
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

  void _showEndShiftSuccessAlert({
    required BuildContext context,
    required String receiptNo,
    required double cash,
    required double bank,
    required int filledReturns,
    required int emptyReturns,
  }) {
    showGeneralDialog(
      context: context,
      barrierDismissible: true,
      barrierLabel: 'Dismiss',
      barrierColor: const Color(0x66000000),
      transitionDuration: const Duration(milliseconds: 220),
      pageBuilder: (ctx, a1, a2) {
        return Center(
          child: Container(
            width: MediaQuery.of(ctx).size.width * 0.88,
            constraints: const BoxConstraints(maxWidth: 360),
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFE2E8F0), width: 1.5),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1A000000),
                  blurRadius: 24,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFFF5C2CB), width: 1.5),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.check_circle_rounded,
                        color: Color(0xFF800020),
                        size: 28,
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  Text(
                    'Shift Ended & Submitted',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 6),

                  Text(
                    'Settlement #$receiptNo queued for Godown verification & reconciliation.',
                    textAlign: TextAlign.center,
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      color: const Color(0xFF64748B),
                      fontWeight: FontWeight.w500,
                      height: 1.4,
                    ),
                  ),

                  const SizedBox(height: 14),

                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Shift Status',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFDF2F4),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFF5C2CB)),
                              ),
                              child: Text(
                                'PENDING VERIFICATION',
                                style: GoogleFonts.inter(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF800020),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        const Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Collections',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                            Text(
                              'Cash \u20B9${cash.toStringAsFixed(0)} • Bank \u20B9${bank.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Returned Stock',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                            Text(
                              '$filledReturns Full • $emptyReturns Empties',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFF800020),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 18),

                  SizedBox(
                    width: double.infinity,
                    height: 42,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(ctx),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF800020),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: Text(
                        'Got it',
                        style: GoogleFonts.inter(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
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
