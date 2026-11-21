import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import '../services/api_service.dart';
import '../widgets/confirm_dialog.dart';
import '../widgets/smooth_transitions.dart';
import 'login_screen.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  int _currentIndex = 0; // 0: Overview, 1: Van Fleet, 2: Revenue, 3: Stock
  bool _isRefreshing = false;

  final TextEditingController _vanSearchController = TextEditingController();
  final FocusNode _vanSearchFocusNode = FocusNode();
  String _vanSearchQuery = '';

  final TextEditingController _revenueSearchController = TextEditingController();
  final FocusNode _revenueSearchFocusNode = FocusNode();
  String _revenueSearchQuery = '';

  final TextEditingController _stockSearchController = TextEditingController();
  final FocusNode _stockSearchFocusNode = FocusNode();
  String _stockSearchQuery = '';

  @override
  void initState() {
    super.initState();
    _vanSearchFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
    _revenueSearchFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
    _stockSearchFocusNode.addListener(() {
      if (mounted) setState(() {});
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshAdminData();
    });
  }

  @override
  void dispose() {
    _vanSearchController.dispose();
    _vanSearchFocusNode.dispose();
    _revenueSearchController.dispose();
    _revenueSearchFocusNode.dispose();
    _stockSearchController.dispose();
    _stockSearchFocusNode.dispose();
    super.dispose();
  }

  Widget _buildAdminSearchBar({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String hintText,
    required String searchQuery,
    required ValueChanged<String> onChanged,
    required VoidCallback onClear,
  }) {
    final isFocused = focusNode.hasFocus;
    return Container(
      height: 46,
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isFocused ? const Color(0xFF800020) : const Color(0xFFCBD5E1),
          width: isFocused ? 1.4 : 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x060F172A),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Center(
        child: TextField(
          controller: controller,
          focusNode: focusNode,
          cursorColor: const Color(0xFF800020),
          cursorWidth: 2.0,
          cursorRadius: const Radius.circular(2),
          onChanged: onChanged,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF0F172A),
          ),
          decoration: InputDecoration(
            hintText: hintText,
            hintStyle: GoogleFonts.inter(
              fontSize: 12.5,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF94A3B8),
            ),
            prefixIcon: Icon(
              Icons.search_rounded,
              color: isFocused ? const Color(0xFF800020) : const Color(0xFF64748B),
              size: 20,
            ),
            suffixIcon: searchQuery.isNotEmpty
                ? IconButton(
                    splashRadius: 18,
                    icon: const Icon(Icons.cancel_rounded, size: 18, color: Color(0xFF64748B)),
                    onPressed: onClear,
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

  Future<void> _refreshAdminData() async {
    if (_isRefreshing) return;
    setState(() => _isRefreshing = true);
    final state = AppStateProvider.of(context);
    try {
      await state.fetchAdminData();
    } catch (_) {}
    if (mounted) {
      setState(() => _isRefreshing = false);
    }
  }

  void _confirmAdminLogout(BuildContext context) async {
    final confirmed = await showSuperGasConfirmDialog(
      context: context,
      title: 'Sign Out?',
      message: 'Are you sure you want to end your administrator session?',
      confirmLabel: 'Sign Out',
      icon: Icons.logout_rounded,
      iconColor: const Color(0xFF800020),
      iconBgColor: const Color(0xFFFDF2F4),
      confirmButtonColor: const Color(0xFF800020),
    );

    if (confirmed == true && context.mounted) {
      await ApiService.logout();
      if (!context.mounted) return;
      Navigator.pushAndRemoveUntil(
        context,
        SmoothPageRoute(page: const LoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);
    final bottomPadding = MediaQuery.of(context).padding.bottom;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: _buildSeamlessAppBar(),
      body: Stack(
        children: [
          Positioned.fill(
            child: PopScope(
              canPop: false,
              onPopInvokedWithResult: (didPop, result) async {
                if (didPop) return;
                if (_currentIndex != 0) {
                  setState(() => _currentIndex = 0);
                  return;
                }
                final exit = await showSuperGasConfirmDialog(
                  context: context,
                  title: 'Exit App?',
                  message: 'Are you sure you want to exit the application?',
                  confirmLabel: 'Exit',
                  icon: Icons.power_settings_new_rounded,
                  iconColor: const Color(0xFF800020),
                  iconBgColor: const Color(0xFFFDF2F4),
                  confirmButtonColor: const Color(0xFF800020),
                );
                if (exit == true && context.mounted) {
                  SystemNavigator.pop();
                }
              },
              child: IndexedStack(
                index: _currentIndex,
                children: [
                  _buildDashboardTab(context, state),
                  _buildVanFleetTab(context, state),
                  _buildRevenueTab(context, state),
                  _buildStockTab(context, state),
                ],
              ),
            ),
          ),

          // Floating Pill Navbar
          if (MediaQuery.of(context).viewInsets.bottom == 0) ...[
            Positioned(
              left: 16,
              right: 16,
              bottom: 12 + bottomPadding,
              child: Container(
                height: 62,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x140F172A),
                      blurRadius: 18,
                      offset: Offset(0, 6),
                    ),
                    BoxShadow(
                      color: Color(0x060F172A),
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _navItem(
                      selectedIcon: Icons.dashboard_rounded,
                      unselectedIcon: Icons.dashboard_outlined,
                      label: 'Overview',
                      index: 0,
                    ),
                    _navItem(
                      selectedIcon: Icons.local_shipping_rounded,
                      unselectedIcon: Icons.local_shipping_outlined,
                      label: 'Van Fleet',
                      index: 1,
                    ),
                    _navItem(
                      selectedIcon: Icons.account_balance_wallet_rounded,
                      unselectedIcon: Icons.account_balance_wallet_outlined,
                      label: 'Revenue',
                      index: 2,
                    ),
                    _navItem(
                      selectedIcon: Icons.warehouse_rounded,
                      unselectedIcon: Icons.warehouse_outlined,
                      label: 'Stock',
                      index: 3,
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _navItem({
    required IconData selectedIcon,
    required IconData unselectedIcon,
    required String label,
    required int index,
  }) {
    final isSelected = _currentIndex == index;
    const activeColor = Color(0xFF800020);
    const inactiveColor = Color(0xFF64748B);

    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _currentIndex = index),
        splashColor: Colors.transparent,
        highlightColor: Colors.transparent,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isSelected ? selectedIcon : unselectedIcon,
              size: 22,
              color: isSelected ? activeColor : inactiveColor,
            ),
            const SizedBox(height: 3),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 10.5,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                color: isSelected ? activeColor : inactiveColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  PreferredSizeWidget _buildSeamlessAppBar() {
    String title = 'Admin';
    String subtitle = 'Executive van & Inventory Overview';

    if (_currentIndex == 1) {
      title = 'Van Fleet';
      subtitle = 'Live Route & Delivery Monitoring';
    } else if (_currentIndex == 2) {
      title = 'Fleet Revenue';
      subtitle = 'Collections & Trip Settlements';
    } else if (_currentIndex == 3) {
      title = 'Stock Inventory';
      subtitle = 'Distribution Hubs & Onboard Stock';
    }

    return AppBar(
      backgroundColor: const Color(0xFFF8FAFC),
      elevation: 0,
      scrolledUnderElevation: 0,
      automaticallyImplyLeading: false,
      centerTitle: false,
      toolbarHeight: 56,
      titleSpacing: 20,
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          Text(
            subtitle,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF64748B),
            ),
          ),
        ],
      ),
      actions: [
        IconButton(
          onPressed: _isRefreshing ? null : _refreshAdminData,
          icon: _isRefreshing
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Color(0xFF800020),
                  ),
                )
              : const Icon(
                  Icons.refresh_rounded,
                  color: Color(0xFF0F172A),
                  size: 20,
                ),
          tooltip: 'Sync Live Data',
        ),
        Padding(
          padding: const EdgeInsets.only(right: 16),
          child: InkWell(
            onTap: () => _confirmAdminLogout(context),
            borderRadius: BorderRadius.circular(8),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFFFDF2F4),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFF5C2CB)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(
                    Icons.logout_rounded,
                    size: 15,
                    color: Color(0xFF800020),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Sign Out',
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
      ],
    );
  }

  // ================= TAB 0: OVERVIEW (DASHBOARD) =================
  Widget _buildDashboardTab(BuildContext context, AppState state) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final centralGodownFilled = state.totalWarehouseFilled;
    final totalWarehouseEmpty = state.totalWarehouseEmpty;
    final vansOnboardFilled = state.totalVansOnboardFilled;
    final activeVansCount = state.totalActiveVansCount;
    final totalRegisteredVans = state.totalRegisteredVansCount;
    final todayRevenue = state.adminTotalRevenueToday;

    final totalFilledSystem = centralGodownFilled + vansOnboardFilled;
    final totalSystemCylinders = totalFilledSystem + totalWarehouseEmpty;
    final todayDeliveriesCount = state.adminSummary.containsKey('today_deliveries_count')
        ? safeInt(state.adminSummary['today_deliveries_count'])
        : state.todayDeliveredCount;

    final vanList = state.adminVans.isNotEmpty
        ? state.adminVans
        : state.fleetDrivers.map((d) => {
              'VehicleNumber': d.vehicle,
              'DriverName': d.name,
              'RouteName': d.route,
              'TotalCylinders': d.cylindersOnboard,
              'AllocatedCylinders': d.cylindersOnboard,
              'DeliveredCylinders': 0,
              'BalanceCylinders': d.cylindersOnboard,
              'EmptyCylinders': 0,
              'Status': d.active ? 'ACTIVE' : 'IDLE',
            }).toList();

    return RefreshIndicator(
      onRefresh: _refreshAdminData,
      color: const Color(0xFF800020),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: EdgeInsets.fromLTRB(16, 12, 16, 96 + bottomPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 4 Executive KPI Tiles
            Row(
              children: [
                Expanded(
                  child: _buildStatTile(
                    title: 'ACTIVE FLEET',
                    value: '$activeVansCount / $totalRegisteredVans',
                    subtext: 'Delivery vans on route',
                    icon: Icons.local_shipping_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatTile(
                    title: 'TODAY DELIVERIES',
                    value: '$todayDeliveriesCount orders',
                    subtext: 'Completed sales today',
                    icon: Icons.done_all_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatTile(
                    title: 'FLEET REVENUE',
                    value: '₹${todayRevenue.toStringAsFixed(0)}',
                    subtext: 'Depot collections today',
                    icon: Icons.account_balance_wallet_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatTile(
                    title: 'TOTAL STOCK',
                    value: '$totalSystemCylinders cyl',
                    subtext: '$totalFilledSystem filled • $totalWarehouseEmpty empty',
                    icon: Icons.warehouse_rounded,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Active Fleet Overview Card
            Container(
              width: double.infinity,
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
                        'ACTIVE FLEET OVERVIEW',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                      InkWell(
                        onTap: () => setState(() => _currentIndex = 1),
                        child: Text(
                          'View All (${vanList.length})',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (vanList.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Center(
                        child: Text(
                          'No vehicles registered in fleet yet.',
                          style: GoogleFonts.inter(
                            fontSize: 12.5,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ),
                    )
                  else
                    ...vanList.map((van) {
                      final plate = (van['VehicleNumber'] ?? van['plate_number'] ?? 'Vehicle').toString().toUpperCase();
                      final driver = (van['DriverName'] ?? van['driver_name'] ?? 'Driver').toString();
                      final route = (van['RouteName'] ?? van['route_name'] ?? 'Assigned Route').toString();
                      final cylinders = safeInt(van['TotalCylinders'] ?? van['BalanceCylinders'] ?? van['cylinders_onboard']);
                      final hasStock = cylinders > 0;

                      return InkWell(
                        onTap: () => setState(() => _currentIndex = 1),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
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
                                decoration: BoxDecoration(
                                  color: hasStock ? const Color(0xFFFDF2F4) : const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(
                                    color: hasStock ? const Color(0xFFF5C2CB) : const Color(0xFFE2E8F0),
                                  ),
                                ),
                                child: Center(
                                  child: Icon(
                                    Icons.local_shipping_rounded,
                                    size: 19,
                                    color: hasStock ? const Color(0xFF800020) : const Color(0xFF64748B),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Flexible(
                                          child: Text(
                                            plate,
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: GoogleFonts.inter(
                                              fontSize: 13.5,
                                              fontWeight: FontWeight.w800,
                                              color: const Color(0xFF0F172A),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: hasStock ? const Color(0xFFFDF2F4) : const Color(0xFFF1F5F9),
                                            borderRadius: BorderRadius.circular(6),
                                            border: Border.all(
                                              color: hasStock ? const Color(0xFFF5C2CB) : const Color(0xFFE2E8F0),
                                            ),
                                          ),
                                          child: Text(
                                            hasStock ? 'LIVE ROUTE' : 'IDLE',
                                            style: GoogleFonts.inter(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.w700,
                                              color: hasStock ? const Color(0xFF800020) : const Color(0xFF64748B),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '$driver • $route',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
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
                                    '$cylinders',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w800,
                                      color: hasStock ? const Color(0xFF800020) : const Color(0xFF64748B),
                                    ),
                                  ),
                                  Text(
                                    'cylinders',
                                    style: GoogleFonts.inter(
                                      fontSize: 9.5,
                                      fontWeight: FontWeight.w500,
                                      color: const Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatTile({
    required String title,
    required String value,
    required String subtext,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: const [
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
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(
                child: Text(
                  title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Icon(icon, size: 17, color: const Color(0xFF800020)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            subtext,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 10,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF64748B),
            ),
          ),
        ],
      ),
    );
  }

  // ================= TAB 1: VAN FLEET (FLEET MONITORING) =================
  Widget _buildVanFleetTab(BuildContext context, AppState state) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final vanList = state.adminVans.isNotEmpty
        ? state.adminVans
        : state.fleetDrivers.map((d) => {
              'VehicleNumber': d.vehicle,
              'DriverName': d.name,
              'RouteName': d.route,
              'TotalCylinders': d.cylindersOnboard,
              'AllocatedCylinders': d.cylindersOnboard,
              'DeliveredCylinders': 0,
              'BalanceCylinders': d.cylindersOnboard,
              'EmptyCylinders': 0,
              'CashCollection': d.mockCashIncome,
              'BankCollection': d.mockUpiIncome,
              'TotalCollection': d.mockCashIncome + d.mockUpiIncome,
              'LiveSales': <Map<String, dynamic>>[],
              'Phone': d.phone,
            }).toList();

    final q = _vanSearchQuery.toLowerCase();
    final filteredVanList = vanList.where((van) {
      if (q.isEmpty) return true;
      final plate = (van['VehicleNumber'] ?? van['plate_number'] ?? '').toString().toLowerCase();
      final driver = (van['DriverName'] ?? van['driver_name'] ?? '').toString().toLowerCase();
      final route = (van['RouteName'] ?? van['route_name'] ?? '').toString().toLowerCase();
      final phone = (van['Phone'] ?? van['DriverPhone'] ?? '').toString().toLowerCase();
      return plate.contains(q) || driver.contains(q) || route.contains(q) || phone.contains(q);
    }).toList();

    return RefreshIndicator(
      onRefresh: _refreshAdminData,
      color: const Color(0xFF800020),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: EdgeInsets.fromLTRB(16, 12, 16, 96 + bottomPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Header Banner
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'MONITORED DELIVERY VANS',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  _vanSearchQuery.isNotEmpty
                      ? '${filteredVanList.length} of ${vanList.length} Vehicles'
                      : '${vanList.length} Vehicles',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF800020),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 10),

            _buildAdminSearchBar(
              controller: _vanSearchController,
              focusNode: _vanSearchFocusNode,
              hintText: 'Search vehicle number, driver, route...',
              searchQuery: _vanSearchQuery,
              onChanged: (val) => setState(() => _vanSearchQuery = val.trim()),
              onClear: () {
                _vanSearchController.clear();
                setState(() => _vanSearchQuery = '');
              },
            ),

            if (filteredVanList.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40),
                child: Center(
                  child: Column(
                    children: [
                      const Icon(Icons.search_off_rounded, size: 36, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 8),
                      Text(
                        _vanSearchQuery.isNotEmpty
                            ? 'No delivery vehicles match "$_vanSearchQuery"'
                            : 'No delivery vehicles found.',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...filteredVanList.map((van) {
                final plate = (van['VehicleNumber'] ?? van['plate_number'] ?? 'Vehicle').toString().toUpperCase();
                final driver = (van['DriverName'] ?? van['driver_name'] ?? 'Driver').toString();
                final route = (van['RouteName'] ?? van['route_name'] ?? 'Assigned Route').toString();
                final phone = (van['Phone'] ?? van['DriverPhone'] ?? '').toString();

                final allocated = safeInt(van['AllocatedCylinders'] ?? van['TotalCylinders']);
                final delivered = safeInt(van['DeliveredCylinders']);
                final balance = safeInt(van['BalanceCylinders'] ?? (allocated - delivered));
                final empties = safeInt(van['EmptyCylinders']);

                final gross = safeDouble(van['TotalCollection'] ?? (safeDouble(van['CashCollection']) + safeDouble(van['BankCollection'])));
                final expenses = safeDouble(van['Expenses'] ?? 0.0);
                final net = gross - expenses;

                final isLive = balance > 0 || delivered > 0;
                final liveSales = List<Map<String, dynamic>>.from(van['LiveSales'] as List? ?? []);

                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
                  padding: const EdgeInsets.all(14),
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
                      // Header: Plate + Route + Status
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: isLive ? const Color(0xFFFDF2F4) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isLive ? const Color(0xFFF5C2CB) : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Center(
                              child: Icon(
                                Icons.local_shipping_rounded,
                                size: 18,
                                color: isLive ? const Color(0xFF800020) : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  plate,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  route,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF800020),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isLive ? const Color(0xFFFDF2F4) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: isLive ? const Color(0xFFF5C2CB) : const Color(0xFFE2E8F0),
                              ),
                            ),
                            child: Text(
                              isLive ? 'LIVE ROUTE' : 'IDLE',
                              style: GoogleFonts.inter(
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                                color: isLive ? const Color(0xFF800020) : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 10),

                      // Driver info row
                      Row(
                        children: [
                          const Icon(Icons.person_rounded, size: 14, color: Color(0xFF64748B)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              phone.isNotEmpty ? '$driver • $phone' : driver,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // 4-Stock Metrics Grid
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            _buildCylinderMetric('Allocated', '$allocated'),
                            _buildCylinderDivider(),
                            _buildCylinderMetric('Delivered', '$delivered'),
                            _buildCylinderDivider(),
                            _buildCylinderMetric('Balance', '$balance'),
                            _buildCylinderDivider(),
                            _buildCylinderMetric('Empties', '$empties'),
                          ],
                        ),
                      ),

                      const SizedBox(height: 10),

                      // Financial Collections Strip
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Gross: ₹${gross.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF475569),
                              ),
                            ),
                            Text(
                              'Exp: ₹${expenses.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                            Text(
                              'Net: ₹${net.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF800020),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 10),

                      // Customer Deliveries View Button
                      InkWell(
                        onTap: () => _showVanDeliveriesModal(context, van),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFDF2F4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFF5C2CB)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(
                                Icons.receipt_long_rounded,
                                size: 14,
                                color: Color(0xFF800020),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                liveSales.isNotEmpty
                                    ? 'View ${liveSales.length} Customer Deliveries'
                                    : 'View Deliveries Details',
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
                );
              }),
          ],
        ),
      ),
    );
  }

  Widget _buildCylinderMetric(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(
            label,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.inter(
              fontSize: 9.5,
              fontWeight: FontWeight.w600,
              color: const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCylinderDivider() {
    return Container(
      width: 1,
      height: 22,
      color: const Color(0xFFE2E8F0),
    );
  }

  void _showVanDeliveriesModal(BuildContext context, Map<String, dynamic> van) {
    final plate = (van['VehicleNumber'] ?? 'Vehicle').toString().toUpperCase();
    final driver = (van['DriverName'] ?? 'Driver').toString();
    final route = (van['RouteName'] ?? 'Route').toString();
    final delivered = safeInt(van['DeliveredCylinders']);
    final empties = safeInt(van['EmptyCylinders']);
    final gross = safeDouble(van['TotalCollection'] ?? (safeDouble(van['CashCollection']) + safeDouble(van['BankCollection'])));
    final liveSales = List<Map<String, dynamic>>.from(van['LiveSales'] as List? ?? []);

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.65,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (_, scrollController) {
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top handle
                Center(
                  child: Container(
                    margin: const EdgeInsets.only(top: 10, bottom: 8),
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFFCBD5E1),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 4, 20, 12),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '$plate Deliveries',
                            style: GoogleFonts.inter(
                              fontSize: 17,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            '$driver • $route',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w500,
                              color: const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(ctx),
                        icon: const Icon(Icons.close_rounded, size: 20, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),

                // Summary strip inside modal
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFF5C2CB)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Text(
                          '$delivered Sold',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                        Container(width: 1, height: 16, color: const Color(0xFFF5C2CB)),
                        Text(
                          '$empties Empties',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                        Container(width: 1, height: 16, color: const Color(0xFFF5C2CB)),
                        Text(
                          '₹${gross.toStringAsFixed(0)} Total',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF800020),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                Expanded(
                  child: liveSales.isEmpty
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(
                                  Icons.receipt_long_rounded,
                                  size: 40,
                                  color: Color(0xFFCBD5E1),
                                ),
                                const SizedBox(height: 10),
                                Text(
                                  'No customer deliveries recorded today',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ListView.separated(
                          controller: scrollController,
                          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
                          itemCount: liveSales.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 10),
                          itemBuilder: (_, idx) {
                            final sale = liveSales[idx];
                            final cust = (sale['CustomerName'] ?? 'Customer').toString();
                            final ticket = (sale['TicketNo'] ?? '').toString();
                            final amt = safeDouble(sale['TotalAmount']);
                            final pMethod = (sale['PaymentMode'] ?? sale['PaymentMethod'] ?? 'CASH').toString().toUpperCase();
                            final delCyls = safeInt(sale['DeliveredCylinders']);
                            final items = List<Map<String, dynamic>>.from(sale['Items'] as List? ?? []);

                            return Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          cust,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: GoogleFonts.inter(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                            color: const Color(0xFF0F172A),
                                          ),
                                        ),
                                      ),
                                      Text(
                                        '₹${amt.toStringAsFixed(0)}',
                                        style: GoogleFonts.inter(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        ticket.isNotEmpty ? 'Ticket: $ticket • $delCyls cyl' : '$delCyls cylinders delivered',
                                        style: GoogleFonts.inter(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                          color: const Color(0xFF64748B),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: pMethod.contains('CASH') ? const Color(0xFFFDF2F4) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(4),
                                          border: Border.all(
                                            color: pMethod.contains('CASH') ? const Color(0xFFF5C2CB) : const Color(0xFFCBD5E1),
                                          ),
                                        ),
                                        child: Text(
                                          pMethod,
                                          style: GoogleFonts.inter(
                                            fontSize: 9,
                                            fontWeight: FontWeight.w700,
                                            color: pMethod.contains('CASH') ? const Color(0xFF800020) : const Color(0xFF475569),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (items.isNotEmpty) ...[
                                    const SizedBox(height: 6),
                                    Text(
                                      items.map((it) => "${it['Qty']}x ${it['ProductName']}").join(', '),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: GoogleFonts.inter(
                                        fontSize: 10.5,
                                        fontWeight: FontWeight.w500,
                                        color: const Color(0xFF64748B),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            );
                          },
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // ================= TAB 2: REVENUE (FINANCIAL MONITORING) =================
  Widget _buildRevenueTab(BuildContext context, AppState state) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final totalRevenue = state.adminTotalRevenueToday;
    final totalCash = state.adminTotalCashToday;
    final totalUpi = state.adminTotalUpiToday;
    final totalExpenses = state.adminTotalExpensesToday;
    final netHandover = totalRevenue - totalExpenses;

    final vanList = state.adminVans.isNotEmpty ? state.adminVans : state.fleetDrivers.map((d) => {
      'VehicleNumber': d.vehicle,
      'DriverName': d.name,
      'RouteName': d.route,
      'TotalCylinders': d.cylindersOnboard,
      'CashCollection': d.mockCashIncome,
      'BankCollection': d.mockUpiIncome,
      'TotalCollection': d.mockCashIncome + d.mockUpiIncome,
      'Expenses': 0.0,
    }).toList();

    final rq = _revenueSearchQuery.toLowerCase();
    final filteredRevenueVans = vanList.where((van) {
      if (rq.isEmpty) return true;
      final plate = (van['VehicleNumber'] ?? van['plate_number'] ?? '').toString().toLowerCase();
      final driver = (van['DriverName'] ?? van['driver_name'] ?? '').toString().toLowerCase();
      final route = (van['RouteName'] ?? van['route_name'] ?? '').toString().toLowerCase();
      return plate.contains(rq) || driver.contains(rq) || route.contains(rq);
    }).toList();

    return RefreshIndicator(
      onRefresh: _refreshAdminData,
      color: const Color(0xFF800020),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: EdgeInsets.fromLTRB(16, 12, 16, 96 + bottomPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Total Revenue Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(color: Color(0x060F172A), blurRadius: 10, offset: Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'TOTAL DEPOT SALES TODAY',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '₹${totalRevenue.toStringAsFixed(0)}',
                    style: GoogleFonts.inter(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // 3-Metric Summary Strip
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _buildFinancialSummaryCol('Gross Sales', '₹${totalRevenue.toStringAsFixed(0)}'),
                        _buildCylinderDivider(),
                        _buildFinancialSummaryCol('Trip Exp.', '₹${totalExpenses.toStringAsFixed(0)}'),
                        _buildCylinderDivider(),
                        _buildFinancialSummaryCol('Net Settlement', '₹${netHandover.toStringAsFixed(0)}', isHighlight: true),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Cash vs UPI Split Cards
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: const [
                        BoxShadow(color: Color(0x060F172A), blurRadius: 8, offset: Offset(0, 2)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'CASH HANDOVER',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF64748B),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const Icon(Icons.payments_rounded, size: 16, color: Color(0xFF800020)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '₹${totalCash.toStringAsFixed(0)}',
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF800020),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Physical desk cash',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: const [
                        BoxShadow(color: Color(0x060F172A), blurRadius: 8, offset: Offset(0, 2)),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'BANK & UPI',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF64748B),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const Icon(Icons.account_balance_rounded, size: 16, color: Color(0xFF0F172A)),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          '₹${totalUpi.toStringAsFixed(0)}',
                          style: GoogleFonts.inter(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Digital direct transfer',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 18),

            // Route-wise Financial Breakdown Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'ROUTE-WISE SETTLEMENT BREAKDOWN',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
                if (_revenueSearchQuery.isNotEmpty)
                  Text(
                    '${filteredRevenueVans.length} of ${vanList.length}',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF800020),
                    ),
                  ),
              ],
            ),

            const SizedBox(height: 10),

            _buildAdminSearchBar(
              controller: _revenueSearchController,
              focusNode: _revenueSearchFocusNode,
              hintText: 'Search vehicle, driver, route...',
              searchQuery: _revenueSearchQuery,
              onChanged: (val) => setState(() => _revenueSearchQuery = val.trim()),
              onClear: () {
                _revenueSearchController.clear();
                setState(() => _revenueSearchQuery = '');
              },
            ),

            if (filteredRevenueVans.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 30),
                child: Center(
                  child: Column(
                    children: [
                      const Icon(Icons.search_off_rounded, size: 36, color: Color(0xFF94A3B8)),
                      const SizedBox(height: 8),
                      Text(
                        _revenueSearchQuery.isNotEmpty
                            ? 'No settlements match "$_revenueSearchQuery"'
                            : 'No route financial data available.',
                        style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
              )
            else
              ...filteredRevenueVans.map((van) {
                final plate = (van['VehicleNumber'] ?? van['plate_number'] ?? 'Vehicle').toString().toUpperCase();
                final driver = (van['DriverName'] ?? van['driver_name'] ?? 'Driver').toString();
                final route = (van['RouteName'] ?? van['route_name'] ?? 'Route').toString();

                final cash = safeDouble(van['CashCollection']);
                final bank = safeDouble(van['BankCollection']);
                final exp = safeDouble(van['Expenses']);
                final net = (cash + bank) - exp;

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: const [
                      BoxShadow(color: Color(0x060F172A), blurRadius: 8, offset: Offset(0, 2)),
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
                              plate,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                            ),
                          ),
                          Text(
                            'Net: ₹${net.toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF800020),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '$driver • $route',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Cash: ₹${cash.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF475569),
                              ),
                            ),
                            Text(
                              'UPI: ₹${bank.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF475569),
                              ),
                            ),
                            Text(
                              'Exp: ₹${exp.toStringAsFixed(0)}',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ],
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

  Widget _buildFinancialSummaryCol(String label, String value, {bool isHighlight = false}) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: const Color(0xFF64748B),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 13.5,
            fontWeight: FontWeight.w800,
            color: isHighlight ? const Color(0xFF800020) : const Color(0xFF0F172A),
          ),
        ),
      ],
    );
  }

  // ================= TAB 3: STOCK (INVENTORY MONITORING) =================
  Widget _buildStockTab(BuildContext context, AppState state) {
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final godowns = state.adminGodowns;
    final vans = state.adminVans;

    final totalLocations = godowns.length + vans.length;
    final totalFilledGodown = state.totalWarehouseFilled;
    final totalEmptyGodown = state.totalWarehouseEmpty;
    final totalFilledVans = state.totalVansOnboardFilled;
    final totalEmptyVans = vans.fold<int>(0, (sum, v) => sum + safeInt(v['EmptyCylinders']));

    final grandTotalFilled = totalFilledGodown + totalFilledVans;
    final grandTotalEmpty = totalEmptyGodown + totalEmptyVans;
    final grandTotalAll = grandTotalFilled + grandTotalEmpty;

    final catalogProducts = state.warehouseItems;

    final sq = _stockSearchQuery.toLowerCase();

    final filteredGodowns = godowns.where((g) {
      if (sq.isEmpty) return true;
      final name = (g['GodownName'] ?? g['name'] ?? '').toString().toLowerCase();
      final address = (g['Address'] ?? g['location'] ?? '').toString().toLowerCase();
      final manager = (g['ManagerName'] ?? '').toString().toLowerCase();
      return name.contains(sq) || address.contains(sq) || manager.contains(sq);
    }).toList();

    final filteredVans = vans.where((v) {
      if (sq.isEmpty) return true;
      final plate = (v['VehicleNumber'] ?? v['plate_number'] ?? '').toString().toLowerCase();
      final driver = (v['DriverName'] ?? v['driver_name'] ?? '').toString().toLowerCase();
      final route = (v['RouteName'] ?? v['route_name'] ?? '').toString().toLowerCase();
      return plate.contains(sq) || driver.contains(sq) || route.contains(sq);
    }).toList();

    final filteredProducts = catalogProducts.where((p) {
      if (sq.isEmpty) return true;
      final title = p.title.toLowerCase();
      final weight = p.weight.toLowerCase();
      return title.contains(sq) || weight.contains(sq);
    }).toList();

    return RefreshIndicator(
      onRefresh: _refreshAdminData,
      color: const Color(0xFF800020),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: EdgeInsets.fromLTRB(16, 12, 16, 96 + bottomPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Summary Header Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(color: Color(0x060F172A), blurRadius: 10, offset: Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'SYSTEM INVENTORY BALANCE',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                      const Icon(Icons.warehouse_rounded, size: 18, color: Color(0xFF800020)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '$grandTotalAll Cylinders',
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$totalLocations locations (${godowns.length} godowns • ${vans.length} delivery vans)',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFF5C2CB)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Total Filled: $grandTotalFilled',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                        Text(
                          'Total Empty: $grandTotalEmpty',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            _buildAdminSearchBar(
              controller: _stockSearchController,
              focusNode: _stockSearchFocusNode,
              hintText: 'Search godowns, vans, routes, products...',
              searchQuery: _stockSearchQuery,
              onChanged: (val) => setState(() => _stockSearchQuery = val.trim()),
              onClear: () {
                _stockSearchController.clear();
                setState(() => _stockSearchQuery = '');
              },
            ),

            // STORAGE GODOWNS LIST
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(color: Color(0x060F172A), blurRadius: 10, offset: Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'DISTRIBUTION HUBS (GODOWNS)',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (_stockSearchQuery.isNotEmpty)
                        Text(
                          '${filteredGodowns.length} of ${godowns.length}',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (filteredGodowns.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Center(
                        child: Text(
                          _stockSearchQuery.isNotEmpty
                              ? 'No godowns match "$_stockSearchQuery"'
                              : 'Central Godown',
                          style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
                        ),
                      ),
                    )
                  else
                    ...filteredGodowns.map((g) {
                      final name = (g['GodownName'] ?? 'Godown').toString();
                      final isCentral = g['IsCentral'] == true;
                      final filled = safeInt(g['FilledQty']);
                      final empty = safeInt(g['EmptyQty']);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.warehouse_rounded, size: 20, color: Color(0xFF800020)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    isCentral ? 'Primary Storage Hub' : 'Sub-Godown Depot',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
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
                                  '$filled filled',
                                  style: GoogleFonts.inter(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  '$empty empty',
                                  style: GoogleFonts.inter(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // DELIVERY VANS LIST
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: const [
                  BoxShadow(color: Color(0x060F172A), blurRadius: 10, offset: Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'DELIVERY VANS (ONBOARD STOCK)',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                      if (_stockSearchQuery.isNotEmpty)
                        Text(
                          '${filteredVans.length} of ${vans.length}',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (filteredVans.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: Text(
                          _stockSearchQuery.isNotEmpty
                              ? 'No delivery vans match "$_stockSearchQuery"'
                              : 'No vans currently on road.',
                          style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
                        ),
                      ),
                    )
                  else
                    ...filteredVans.map((v) {
                      final plate = (v['VehicleNumber'] ?? 'Van').toString();
                      final driver = (v['DriverName'] ?? 'Driver').toString();
                      final route = (v['RouteName'] ?? 'Route').toString();
                      final filled = safeInt(v['BalanceCylinders'] ?? v['TotalCylinders']);
                      final empty = safeInt(v['EmptyCylinders']);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.local_shipping_rounded, size: 20, color: Color(0xFF800020)),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    plate,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    '$driver • $route',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
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
                                  '$filled filled',
                                  style: GoogleFonts.inter(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF800020),
                                  ),
                                ),
                                Text(
                                  '$empty empty',
                                  style: GoogleFonts.inter(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),

            if (catalogProducts.isNotEmpty) ...[
              const SizedBox(height: 16),

              // Product Breakdown Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: const [
                    BoxShadow(color: Color(0x060F172A), blurRadius: 10, offset: Offset(0, 3)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'PRODUCT INVENTORY BREAKDOWN',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF64748B),
                            letterSpacing: 0.5,
                          ),
                        ),
                        if (_stockSearchQuery.isNotEmpty)
                          Text(
                            '${filteredProducts.length} of ${catalogProducts.length}',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF800020),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (filteredProducts.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Center(
                          child: Text(
                            _stockSearchQuery.isNotEmpty
                                ? 'No products match "$_stockSearchQuery"'
                                : 'No catalog products available.',
                            style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
                          ),
                        ),
                      )
                    else
                      ...filteredProducts.map((p) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
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
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    p.weight,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: const Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    p.title,
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
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
                                  '${p.filledStock} in stock',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                if (p.price > 0)
                                  Text(
                                    '₹${p.price.toStringAsFixed(0)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w600,
                                      color: const Color(0xFF800020),
                                    ),
                                  ),
                              ],
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
    );
  }
}
