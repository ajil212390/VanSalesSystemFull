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
  int _currentIndex = 0; // 0: Dashboard, 1: Allocate, 2: Revenue, 3: Inventory by Location

  // --- Allocate Tab State ---
  int? _selectedAllocationId;
  int _selectedGodownId = 1; // Default to Main Godown (Central)
  final TextEditingController _remarksController = TextEditingController();
  final Map<int, TextEditingController> _cylinderQtyControllers = {};
  bool _isAllocating = false;
  bool _isRefreshing = false;

  @override
  void initState() {
    super.initState();
    // Hydrate live admin data when AdminScreen mounts
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshAdminData();
    });
  }

  @override
  void dispose() {
    _remarksController.dispose();
    for (final c in _cylinderQtyControllers.values) {
      c.dispose();
    }
    super.dispose();
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

  void _showFeedback(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        backgroundColor: isError ? const Color(0xFF0F172A) : const Color(0xFF800020),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _confirmAdminLogout(BuildContext context) async {
    final confirmed = await showSuperGasConfirmDialog(
      context: context,
      title: 'Sign Out?',
      message: 'Are you sure you want to end your manager session?',
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
                  _buildAllocateTab(context, state),
                  _buildRevenueTab(context, state),
                  _buildInventoryByLocationTab(context, state),
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
                      selectedIcon: Icons.grid_view_rounded,
                      unselectedIcon: Icons.grid_view_outlined,
                      label: 'Dashboard',
                      index: 0,
                    ),
                    _navItem(
                      selectedIcon: Icons.swap_horiz_rounded,
                      unselectedIcon: Icons.swap_horiz_outlined,
                      label: 'Allocate',
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
                      label: 'Locations',
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

  // ================= TOP APPBAR =================
  PreferredSizeWidget _buildSeamlessAppBar() {
    String title = 'Manager Dashboard';

    if (_currentIndex == 1) {
      title = 'Allocate Van Stock';
    } else if (_currentIndex == 2) {
      title = 'Fleet Revenue';
    } else if (_currentIndex == 3) {
      title = 'Inventory by Location';
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
            'FutureGas Fleet & Depot Operations',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: const Color(0xFF64748B),
            ),
          ),
        ],
      ),
      actions: [
        // Live Refresh Button
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
        // Logout Button
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
                    'Logout',
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

  // ================= TAB 1: DASHBOARD =================
  Widget _buildDashboardTab(BuildContext context, AppState state) {
    final centralGodownFilled = state.totalWarehouseFilled;
    final vansOnboardFilled = state.totalVansOnboardFilled;
    final activeVansCount = state.totalActiveVansCount;
    final totalRegisteredVans = state.totalRegisteredVansCount;
    final todayRevenue = state.adminTotalRevenueToday;

    final vanList = state.adminVans.isNotEmpty
        ? state.adminVans
        : state.fleetDrivers.map((d) => {
              'VehicleNumber': d.vehicle,
              'DriverName': d.name,
              'RouteName': d.route,
              'TotalCylinders': d.cylindersOnboard,
              'Status': d.active ? 'ACTIVE' : 'IDLE',
            }).toList();

    return RefreshIndicator(
      onRefresh: _refreshAdminData,
      color: const Color(0xFF800020),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.only(left: 16, right: 16, top: 10, bottom: 90),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 4 Clean Stat Tiles matching web portal cards
            Row(
              children: [
                Expanded(
                  child: _buildStatTile(
                    title: 'CENTRAL GODOWN',
                    value: '$centralGodownFilled filled',
                    subtext: 'Central warehouse stock',
                    icon: Icons.warehouse_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatTile(
                    title: 'VANS ONBOARD',
                    value: '$vansOnboardFilled filled',
                    subtext: '$activeVansCount active delivery vehicles',
                    icon: Icons.local_shipping_rounded,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _buildStatTile(
                    title: 'ACTIVE FLEET',
                    value: '$activeVansCount / $totalRegisteredVans',
                    subtext: 'Delivery vans ready',
                    icon: Icons.alt_route_rounded,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatTile(
                    title: "TODAY'S SALES",
                    value: '₹${todayRevenue.toStringAsFixed(0)}',
                    subtext: 'Depot collections today',
                    icon: Icons.trending_up_rounded,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            // Burgundy Allocate Van Banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF5A0016), Color(0xFF800020)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x18800020),
                    blurRadius: 10,
                    offset: Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.swap_horiz_rounded,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Allocate Van Stock',
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Transfer cylinders from Godown to Delivery Van',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: Colors.white.withValues(alpha: 0.85),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: () => setState(() => _currentIndex = 1),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: const Color(0xFF800020),
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: Text(
                      'Load Van',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 18),

            // Live Van Fleet List
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
                        'DELIVERY FLEET ON ROUTE',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF64748B),
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        '${vanList.length} Vans',
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: const Color(0xFF800020),
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
                      final cylinders = safeInt(van['TotalCylinders'] ?? van['cylinders_onboard']);
                      final hasStock = cylinders > 0;

                      return Container(
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
                                      Text(
                                        plate,
                                        style: GoogleFonts.inter(
                                          fontSize: 13.5,
                                          fontWeight: FontWeight.w800,
                                          color: const Color(0xFF0F172A),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: hasStock ? const Color(0xFFF0FDF4) : const Color(0xFFF1F5F9),
                                          borderRadius: BorderRadius.circular(6),
                                          border: Border.all(
                                            color: hasStock ? const Color(0xFFBBF7D0) : const Color(0xFFE2E8F0),
                                          ),
                                        ),
                                        child: Text(
                                          hasStock ? 'ON ROUTE' : 'IDLE',
                                          style: GoogleFonts.inter(
                                            fontSize: 9.5,
                                            fontWeight: FontWeight.w700,
                                            color: hasStock ? const Color(0xFF16A34A) : const Color(0xFF64748B),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '$driver • $route',
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
              Text(
                title,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
              Icon(icon, size: 17, color: const Color(0xFF800020)),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
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

  // ================= TAB 2: ALLOCATE VAN STOCK =================
  Widget _buildAllocateTab(BuildContext context, AppState state) {
    final allocations = state.adminAllocations;
    final godowns = state.adminGodowns;
    final catalogProducts = state.adminCatalogProducts.isNotEmpty
        ? state.adminCatalogProducts
        : [
            {'ProductId': 24, 'ProductName': 'LPG 17KG GAS CYLINDER', 'AppProductName': '17KG', 'SalesPrice': 1200.0},
            {'ProductId': 23, 'ProductName': 'LPG 12KG GAS CYLINDER', 'AppProductName': '12KG', 'SalesPrice': 700.0},
            {'ProductId': 25, 'ProductName': 'LPG 21KG GAS CYLINDER', 'AppProductName': '21KG', 'SalesPrice': 3160.0},
            {'ProductId': 22, 'ProductName': 'LPG 04KG GAS CYLINDER', 'AppProductName': '04KG', 'SalesPrice': 550.0},
          ];

    // Ensure controllers exist for all catalog products
    for (final p in catalogProducts) {
      final pid = safeInt(p['ProductId']);
      if (!_cylinderQtyControllers.containsKey(pid)) {
        _cylinderQtyControllers[pid] = TextEditingController(text: '');
      }
    }

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(left: 16, right: 16, top: 10, bottom: 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. SELECT VEHICLE & DRIVER CARD
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
                  children: [
                    const Icon(Icons.local_shipping_rounded, size: 18, color: Color(0xFF800020)),
                    const SizedBox(width: 8),
                    Text(
                      '1. SELECT DESTINATION VEHICLE',
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      isExpanded: true,
                      value: _selectedAllocationId,
                      hint: Text(
                        'Choose vehicle & driver to load...',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF64748B),
                        ),
                      ),
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                      items: allocations.map((alloc) {
                        final allocId = safeInt(alloc['RouteVehicleDriverId'] ?? alloc['id']);
                        final plate = (alloc['VehicleNumber'] ?? alloc['vehicle_number'] ?? 'Van').toString();
                        final driver = (alloc['DriverName'] ?? alloc['driver_name'] ?? 'Driver').toString();
                        final route = (alloc['RouteName'] ?? alloc['route_name'] ?? 'Route').toString();
                        return DropdownMenuItem<int>(
                          value: allocId,
                          child: Text(
                            '$plate • $driver ($route)',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (id) => setState(() => _selectedAllocationId = id),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 2. SOURCE GODOWN SELECTION
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
                  children: [
                    const Icon(Icons.warehouse_rounded, size: 18, color: Color(0xFF800020)),
                    const SizedBox(width: 8),
                    Text(
                      '2. SOURCE STORAGE GODOWN',
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
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<int>(
                      isExpanded: true,
                      value: _selectedGodownId,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                      items: godowns.map((g) {
                        final gId = safeInt(g['GodownId']);
                        final gName = (g['GodownName'] ?? 'Godown').toString();
                        final filled = safeInt(g['FilledQty']);
                        return DropdownMenuItem<int>(
                          value: gId,
                          child: Text(
                            '$gName ($filled available)',
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (id) {
                        if (id != null) setState(() => _selectedGodownId = id);
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 3. CYLINDERS TO LOAD TABLE
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
                    Row(
                      children: [
                        const Icon(Icons.propane_tank_rounded, size: 18, color: Color(0xFF800020)),
                        const SizedBox(width: 8),
                        Text(
                          '3. CYLINDERS TO LOAD',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Rate / Unit',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Table Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFDF2F4),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 6,
                        child: Text(
                          'Cylinder Product',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 4,
                        child: Text(
                          'Quantity (Qty)',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),

                // Table Rows
                ...catalogProducts.map((p) {
                  final pid = safeInt(p['ProductId']);
                  final name = (p['AppProductName'] != null && p['AppProductName'].toString().isNotEmpty)
                      ? p['AppProductName'].toString()
                      : (p['ProductName'] ?? 'Cylinder').toString();
                  final rate = safeDouble(p['SalesPrice']);
                  final controller = _cylinderQtyControllers[pid]!;

                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 6,
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
                                '₹${rate.toStringAsFixed(0)}',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          flex: 4,
                          child: Container(
                            height: 38,
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: TextField(
                              controller: controller,
                              keyboardType: TextInputType.number,
                              textAlign: TextAlign.center,
                              style: GoogleFonts.inter(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                              decoration: InputDecoration(
                                hintText: '0',
                                hintStyle: GoogleFonts.inter(
                                  color: const Color(0xFF94A3B8),
                                  fontSize: 13,
                                ),
                                border: InputBorder.none,
                                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                                isDense: true,
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

          const SizedBox(height: 16),

          // CONFIRM ALLOCATION BUTTON
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _isAllocating ? null : () => _handleConfirmAllocation(state),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF800020),
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isAllocating
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2.2, color: Colors.white),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle_outline_rounded, size: 19),
                        const SizedBox(width: 8),
                        Text(
                          'Confirm & Load Van Stock',
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
            ),
          ),

          const SizedBox(height: 22),

          // RECENT VAN STOCK LOADS (Delivery Notes)
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
                      'RECENT DELIVERY NOTES',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF64748B),
                        letterSpacing: 0.5,
                      ),
                    ),
                    Text(
                      '${state.adminRecentNotes.length} Dispatches',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF800020),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                if (state.adminRecentNotes.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    child: Center(
                      child: Text(
                        'No van stock loads recorded yet.',
                        style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
                      ),
                    ),
                  )
                else
                  ...state.adminRecentNotes.map((dn) {
                    final noteNo = (dn['DeliveryNoteNo'] ?? dn['note_no'] ?? 'DN').toString();
                    final date = (dn['DeliveryDate'] ?? dn['date'] ?? '').toString();
                    final vehicle = (dn['vehicle_number'] ?? dn['VehicleNumber'] ?? 'Van').toString();
                    final driver = (dn['driver_name'] ?? dn['DriverName'] ?? 'Driver').toString();
                    final totalCyl = safeInt(dn['total_cylinders'] ?? dn['TotalCylinders']);

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
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFDF2F4),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFF5C2CB)),
                            ),
                            child: Text(
                              noteNo,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
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
                                  '$vehicle • $driver',
                                  style: GoogleFonts.inter(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.w700,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  date,
                                  style: GoogleFonts.inter(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w500,
                                    color: const Color(0xFF64748B),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF0FDF4),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFBBF7D0)),
                            ),
                            child: Text(
                              '$totalCyl LOADED',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF16A34A),
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
      ),
    );
  }

  Future<void> _handleConfirmAllocation(AppState state) async {
    if (_selectedAllocationId == null) {
      _showFeedback('Please select a destination vehicle to allocate', isError: true);
      return;
    }

    final lines = <Map<String, dynamic>>[];
    _cylinderQtyControllers.forEach((pid, controller) {
      final qty = int.tryParse(controller.text.trim()) ?? 0;
      if (qty > 0) {
        lines.add({
          'Product': pid,
          'Quantity': qty,
        });
      }
    });

    if (lines.isEmpty) {
      _showFeedback('Please enter quantity for at least one cylinder', isError: true);
      return;
    }

    setState(() => _isAllocating = true);

    try {
      final res = await state.submitVehicleAllocation(
        allocationId: _selectedAllocationId!,
        godownId: _selectedGodownId,
        lines: lines,
        remarks: _remarksController.text.trim(),
      );

      if (!mounted) return;

      if (res['success'] == true) {
        // Clear inputs
        for (final c in _cylinderQtyControllers.values) {
          c.text = '';
        }
        _remarksController.clear();

        final noteNo = res['data']?['DeliveryNoteNo'] ?? 'Note';
        _showFeedback('Van stock loaded successfully ($noteNo)!');
        setState(() => _currentIndex = 0); // Switch back to dashboard overview
      } else {
        _showFeedback(res['message'] ?? 'Failed to create delivery note', isError: true);
      }
    } catch (e) {
      if (mounted) {
        _showFeedback('Error submitting allocation: $e', isError: true);
      }
    } finally {
      if (mounted) {
        setState(() => _isAllocating = false);
      }
    }
  }

  // ================= TAB 3: REVENUE =================
  Widget _buildRevenueTab(BuildContext context, AppState state) {
    final totalRevenue = state.adminTotalRevenueToday;
    final totalCash = state.adminTotalCashToday;
    final totalUpi = state.adminTotalUpiToday;

    final vanList = state.adminVans.isNotEmpty ? state.adminVans : state.fleetDrivers.map((d) => {
      'VehicleNumber': d.vehicle,
      'DriverName': d.name,
      'RouteName': d.route,
      'TotalCylinders': d.cylindersOnboard,
      'CashCollection': d.mockCashIncome,
      'BankCollection': d.mockUpiIncome,
      'TotalCollection': d.mockCashIncome + d.mockUpiIncome,
    }).toList();

    return RefreshIndicator(
      onRefresh: _refreshAdminData,
      color: const Color(0xFF800020),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.only(left: 16, right: 16, top: 10, bottom: 90),
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

                  // Cash vs UPI split
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Cash Collection',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '₹${totalCash.toStringAsFixed(0)}',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF16A34A),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Bank / UPI',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '₹${totalUpi.toStringAsFixed(0)}',
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFF800020),
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

            const SizedBox(height: 18),

            // Driver-Wise Collections Breakdown
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
                  Text(
                    'FLEET SALES BY VEHICLE',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (vanList.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: Text(
                          'No vehicle sales recorded yet.',
                          style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
                        ),
                      ),
                    )
                  else
                    ...vanList.map((v) {
                      final plate = (v['VehicleNumber'] ?? v['plate_number'] ?? 'Van').toString();
                      final driver = (v['DriverName'] ?? v['driver_name'] ?? 'Driver').toString();
                      final route = (v['RouteName'] ?? v['route_name'] ?? 'Route').toString();
                      final cash = safeDouble(v['CashCollection']);
                      final upi = safeDouble(v['BankCollection']);
                      final total = safeDouble(v['TotalCollection']);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
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
                                  plate,
                                  style: GoogleFonts.inter(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                Text(
                                  '₹${total.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF800020),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              '$driver • $route',
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Text(
                                  'Cash: ₹${cash.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: const Color(0xFF16A34A),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  'UPI: ₹${upi.toStringAsFixed(0)}',
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

  // ================= TAB 4: INVENTORY BY LOCATION =================
  Widget _buildInventoryByLocationTab(BuildContext context, AppState state) {
    final godowns = state.adminGodowns;
    final vans = state.adminVans;

    final totalLocations = godowns.length + vans.length;
    final totalFilledSystem = state.totalWarehouseFilled + state.totalVansOnboardFilled;
    final totalEmptySystem = state.totalWarehouseEmpty;

    return RefreshIndicator(
      onRefresh: _refreshAdminData,
      color: const Color(0xFF800020),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
        padding: const EdgeInsets.only(left: 16, right: 16, top: 10, bottom: 90),
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
                        'TOTAL LOCATIONS',
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
                  const SizedBox(height: 4),
                  Text(
                    '$totalLocations locations',
                    style: GoogleFonts.inter(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF0F172A),
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${godowns.length} godowns • ${vans.length} delivery vans',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

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
                  Text(
                    'STORAGE GODOWNS',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (godowns.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Center(
                        child: Text(
                          'Central Godown',
                          style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFF0F172A)),
                        ),
                      ),
                    )
                  else
                    ...godowns.map((g) {
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
                                    isCentral ? 'Primary Storage Hub' : 'Sub-Godown',
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
                  Text(
                    'DELIVERY VANS (ONBOARD STOCK)',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 12),

                  if (vans.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Center(
                        child: Text(
                          'No vans currently on road.',
                          style: GoogleFonts.inter(fontSize: 12.5, color: const Color(0xFF64748B)),
                        ),
                      ),
                    )
                  else
                    ...vans.map((v) {
                      final plate = (v['VehicleNumber'] ?? 'Van').toString();
                      final driver = (v['DriverName'] ?? 'Driver').toString();
                      final route = (v['RouteName'] ?? 'Route').toString();
                      final filled = safeInt(v['TotalCylinders'] ?? v['AllocatedCylinders']);
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

            const SizedBox(height: 16),

            // SYSTEM TOTALS CARD
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFFDF2F4),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFF5C2CB)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'TOTAL SYSTEM CYLINDERS',
                    style: GoogleFonts.inter(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                    ),
                  ),
                  Text(
                    '$totalFilledSystem Filled • $totalEmptySystem Empty',
                    style: GoogleFonts.inter(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
