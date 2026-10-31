import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/app_state.dart';
import '../widgets/confirm_dialog.dart';
import '../widgets/smooth_transitions.dart';
import 'login_screen.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  int _currentIndex = 0; // 0: Dashboard, 1: Allocate, 2: Revenue, 3: Profile

  // --- Dashboard Tab State ---
  bool _showAllDriversInDashboard = false;

  // --- Allocate Tab State ---
  String? _selectedVehiclePlate;
  String? _selectedDriverId;
  final Map<String, TextEditingController> _weightControllers = {
    '33 KG': TextEditingController(text: ''),
    '21 KG': TextEditingController(text: ''),
    '17 KG': TextEditingController(text: ''),
    '12 KG': TextEditingController(text: ''),
    '4 KG': TextEditingController(text: ''),
  };

  // --- Revenue Tab Expanded State ---
  final Set<String> _expandedDriverIds = {'DRV001'};
  final Set<String> _expandedExpenseDriverIds = {};
  final Set<String> _expandedReportDriverIds = {'DRV001'};

  @override
  void dispose() {
    for (final controller in _weightControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _showFeedback(String message, {bool isError = false}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        backgroundColor: isError ? const Color(0xFF1E293B) : const Color(0xFF16A34A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  void _confirmAdminLogout(BuildContext context) async {
    final confirmed = await showSuperGasConfirmDialog(
      context: context,
      title: 'Sign Out?',
      message: 'Are you sure you want to end your administrative session?',
      confirmLabel: 'Sign Out',
      icon: Icons.logout_rounded,
      iconColor: const Color(0xFFDC2626),
      iconBgColor: const Color(0xFFFEF2F2),
      confirmButtonColor: const Color(0xFFDC2626),
    );

    if (confirmed == true && context.mounted) {
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
      backgroundColor: const Color(0xFFF1F5F9),
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
                  iconColor: const Color(0xFFDC2626),
                  iconBgColor: const Color(0xFFFEF2F2),
                  confirmButtonColor: const Color(0xFFDC2626),
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
                  _buildReportsTab(context, state),
                ],
              ),
            ),
          ),
          if (MediaQuery.of(context).viewInsets.bottom == 0) ...[
            // Subtle short bottom white shade blending upwards from screen bottom
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              height: 38 + bottomPadding,
              child: IgnorePointer(
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        Color(0xD9FFFFFF),
                        Color(0x59FFFFFF),
                        Color(0x00FFFFFF),
                      ],
                      stops: [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              ),
            ),

            // Floating Pill Navbar
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
                      color: Color(0x1A000000),
                      blurRadius: 18,
                      offset: Offset(0, 6),
                    ),
                    BoxShadow(
                      color: Color(0x06000000),
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
                    selectedIcon: Icons.assessment_rounded,
                    unselectedIcon: Icons.assessment_outlined,
                    label: 'Inventory',
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
    const activeColor = Color(0xFFDC2626);
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

  // ================= SEAMLESS BLENDED APPBAR =================
  PreferredSizeWidget _buildSeamlessAppBar() {
    String title = 'Admin';

    if (_currentIndex == 1) {
      title = 'Allocate Vehicle';
    } else if (_currentIndex == 2) {
      title = 'Revenue';
    } else if (_currentIndex == 3) {
      title = 'Inventory & Reports';
    }

    return AppBar(
      backgroundColor: const Color(0xFFF1F5F9),
      elevation: 0,
      scrolledUnderElevation: 0,
      automaticallyImplyLeading: false,
      centerTitle: false,
      toolbarHeight: 52,
      titleSpacing: 20,
      title: Text(
        title,
        style: GoogleFonts.inter(
          fontSize: 22,
          fontWeight: FontWeight.w800,
          color: const Color(0xFF0F172A),
          letterSpacing: -0.5,
        ),
      ),
      actions: [
        if (_currentIndex == 0)
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: InkWell(
              onTap: () => _confirmAdminLogout(context),
              borderRadius: BorderRadius.circular(8),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.logout_rounded,
                      size: 16,
                      color: Color(0xFFDC2626),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      'Logout',
                      style: GoogleFonts.inter(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFFDC2626),
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
    final totalVehicles = state.vehicles.length;
    final totalDrivers = state.fleetDrivers.length;
    final totalWarehouseStock = state.totalWarehouseFilled;
    final todaySales = state.adminTotalRevenueToday;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(left: 16, right: 16, top: 6, bottom: 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stat Cards Grid
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  title: 'Vehicles',
                  value: '$totalVehicles',
                  icon: Icons.local_shipping_rounded,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  title: 'Drivers',
                  value: '$totalDrivers',
                  icon: Icons.badge_rounded,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  title: 'In Stock',
                  value: '$totalWarehouseStock',
                  icon: Icons.propane_tank_rounded,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  title: "Today's Sale",
                  value: '\u20B9${todaySales.toStringAsFixed(0)}',
                  icon: Icons.trending_up_rounded,
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Red-Themed "Allocate Vehicles" Card (Matching Start New Delivery design)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF991B1B), Color(0xFFDC2626)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(18),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1CDC2626),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.swap_horiz_rounded,
                      color: Colors.white,
                      size: 24,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Allocate Vehicles',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: Colors.white,
                          letterSpacing: 0.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Assign driver & cylinder stock',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.w500,
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () => setState(() => _currentIndex = 1),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFFDC2626),
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  child: Text(
                    'Allocate',
                    style: GoogleFonts.inter(
                      fontSize: 12.5,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Drivers & Vehicles List
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'DRIVERS & VEHICLES',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),

                ...((_showAllDriversInDashboard
                        ? state.fleetDrivers
                        : state.fleetDrivers.take(3).toList())
                    .map((driver) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.local_shipping_rounded,
                          size: 20,
                          color: Color(0xFFDC2626),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                driver.name,
                                style: GoogleFonts.inter(
                                  fontSize: 13.5,
                                  fontWeight: FontWeight.w700,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                              Text(
                                driver.vehicle.isNotEmpty ? driver.vehicle : 'Unassigned',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Text(
                          '${driver.cylindersOnboard} Cylinders',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  );
                })),
                if (state.fleetDrivers.length > 3) ...[
                  const SizedBox(height: 4),
                  Center(
                    child: InkWell(
                      onTap: () {
                        setState(() {
                          _showAllDriversInDashboard = !_showAllDriversInDashboard;
                        });
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _showAllDriversInDashboard
                                  ? 'Show Less'
                                  : 'View All (${state.fleetDrivers.length})',
                              style: GoogleFonts.inter(
                                fontSize: 12.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFDC2626),
                              ),
                            ),
                            const SizedBox(width: 4),
                            Icon(
                              _showAllDriversInDashboard
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: const Color(0xFFDC2626),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title.toUpperCase(),
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF64748B),
                  letterSpacing: 0.5,
                ),
              ),
              Icon(icon, size: 18, color: const Color(0xFFDC2626)),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }

  // ================= TAB 2: ALLOCATE (SEPARATE SPACIOUS CARDS) =================
  Widget _buildAllocateTab(BuildContext context, AppState state) {
    final vehicleList = state.availableVehicles;
    final driverList = state.fleetDrivers;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(left: 16, right: 16, top: 12, bottom: 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Subheading / Header Badge
          Row(
            children: [
              const Icon(Icons.swap_horiz_rounded, size: 20, color: Color(0xFFDC2626)),
              const SizedBox(width: 8),
              Text(
                'ALLOCATE VEHICLE & STOCK',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFFDC2626),
                  letterSpacing: 0.5,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // 1. SELECT VEHICLE CARD
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.local_shipping_rounded, size: 17, color: Color(0xFFDC2626)),
                        const SizedBox(width: 6),
                        Text(
                          '1. SELECT VEHICLE',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    InkWell(
                      onTap: () => _openAddVehicleBottomSheet(context, state),
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: Row(
                          children: [
                            const Icon(Icons.add_circle_outline_rounded, size: 14, color: Color(0xFFDC2626)),
                            const SizedBox(width: 4),
                            Text(
                              '+ Add Vehicle',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFDC2626),
                              ),
                            ),
                          ],
                        ),
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
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _selectedVehiclePlate,
                      hint: Text(
                        'Choose vehicle number...',
                        style: GoogleFonts.inter(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                      items: vehicleList.map((plate) {
                        return DropdownMenuItem<String>(
                          value: plate,
                          child: Text(
                            plate,
                            style: GoogleFonts.inter(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (plate) {
                        if (plate == null) return;
                        setState(() {
                          _selectedVehiclePlate = plate;
                          final vehicle = state.vehicles.firstWhere(
                            (v) => v.plateNumber == plate,
                            orElse: () => DepotVehicle(
                              plateNumber: plate,
                              assignedDriverName: '',
                              assignedDriverId: '',
                              route: 'Route #1A',
                            ),
                          );
                          final s33 = vehicle.stock['33 KG'] ?? 0;
                          _weightControllers['33 KG']?.text = s33 > 0 ? '$s33' : '';
                          final s21 = vehicle.stock['21 KG'] ?? 0;
                          _weightControllers['21 KG']?.text = s21 > 0 ? '$s21' : '';
                          final s17 = vehicle.stock['17 KG'] ?? 0;
                          _weightControllers['17 KG']?.text = s17 > 0 ? '$s17' : '';
                          final s12 = vehicle.stock['12 KG'] ?? 0;
                          _weightControllers['12 KG']?.text = s12 > 0 ? '$s12' : '';
                          final s4 = vehicle.stock['4 KG'] ?? 0;
                          _weightControllers['4 KG']?.text = s4 > 0 ? '$s4' : '';
                        });
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 2. SELECT DRIVER CARD
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.person_rounded, size: 17, color: Color(0xFFDC2626)),
                        const SizedBox(width: 6),
                        Text(
                          '2. SELECT DRIVER',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                    InkWell(
                      onTap: () => _openAddDriverBottomSheet(context, state),
                      borderRadius: BorderRadius.circular(6),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        child: Row(
                          children: [
                            const Icon(Icons.person_add_alt_1_outlined, size: 14, color: Color(0xFFDC2626)),
                            const SizedBox(width: 4),
                            Text(
                              '+ Add Driver',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w700,
                                color: const Color(0xFFDC2626),
                              ),
                            ),
                          ],
                        ),
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
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _selectedDriverId,
                      hint: Text(
                        'Choose driver to allocate...',
                        style: GoogleFonts.inter(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w500,
                          color: const Color(0xFF94A3B8),
                        ),
                      ),
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
                      items: driverList.map((driver) {
                        return DropdownMenuItem<String>(
                          value: driver.id,
                          child: Text(
                            driver.name,
                            style: GoogleFonts.inter(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        );
                      }).toList(),
                      onChanged: (id) => setState(() => _selectedDriverId = id),
                    ),
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 3. ALLOCATE CYLINDERS CARD
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.propane_tank_rounded, size: 17, color: Color(0xFFDC2626)),
                    const SizedBox(width: 6),
                    Text(
                      '3. ALLOCATE CYLINDERS',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFF0F172A),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Table Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        flex: 6,
                        child: Text(
                          'Weight (KG)',
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ),
                      Expanded(
                        flex: 4,
                        child: Text(
                          'Filled Qty',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFFDC2626),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),

                // Clean Table Rows
                ...['33 KG', '21 KG', '17 KG', '12 KG', '4 KG'].map((weight) {
                  final controller = _weightControllers[weight]!;
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: const BoxDecoration(
                      border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          flex: 6,
                          child: Text(
                            weight,
                            style: GoogleFonts.inter(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 4,
                          child: TextField(
                            controller: controller,
                            keyboardType: TextInputType.number,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                            decoration: InputDecoration(
                              hintText: '--',
                              hintStyle: GoogleFonts.inter(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w600,
                                color: const Color(0xFF94A3B8),
                              ),
                              border: InputBorder.none,
                              focusedBorder: InputBorder.none,
                              enabledBorder: InputBorder.none,
                              errorBorder: InputBorder.none,
                              disabledBorder: InputBorder.none,
                              contentPadding: EdgeInsets.zero,
                              isDense: true,
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

          const SizedBox(height: 18),

          // 4. STANDALONE SAVE ALLOCATION BUTTON
          Container(
            width: double.infinity,
            height: 50,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF991B1B), Color(0xFFDC2626)],
                begin: Alignment.centerLeft,
                end: Alignment.centerRight,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x28DC2626),
                  blurRadius: 10,
                  offset: Offset(0, 3),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => _saveAllocation(state),
                borderRadius: BorderRadius.circular(14),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.check_circle_rounded, size: 18, color: Colors.white),
                    const SizedBox(width: 8),
                    Text(
                      'Save Allocation',
                      style: GoogleFonts.inter(
                        fontSize: 14.5,
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
          const SizedBox(height: 20),
        ],
      ),
    );
  }

  void _saveAllocation(AppState state) {
    if (_selectedVehiclePlate == null || _selectedVehiclePlate!.isEmpty) {
      _showFeedback('Please select a vehicle to allocate', isError: true);
      return;
    }

    final stock = <String, int>{};
    int totalCount = 0;
    _weightControllers.forEach((weight, controller) {
      final qty = int.tryParse(controller.text.trim()) ?? 0;
      stock[weight] = qty;
      totalCount += qty;
    });

    final driver = state.fleetDrivers.firstWhere(
      (d) => d.id == _selectedDriverId,
      orElse: () => state.fleetDrivers.isNotEmpty
          ? state.fleetDrivers[0]
          : AdminDriver(id: '', name: 'Driver', vehicle: '', phone: '', password: ''),
    );

    state.allocateStockToVehicle(
      plateNumber: _selectedVehiclePlate!,
      stockByWeight: stock,
      assignedDriverName: driver.name,
      route: driver.route,
    );

    if (_selectedDriverId != null && _selectedDriverId!.isNotEmpty) {
      state.allocateVehicleAndStock(
        driverId: _selectedDriverId!,
        vehicle: _selectedVehiclePlate!,
        route: driver.route,
        stockByWeight: stock,
      );
    }

    _showAllocationSuccessAlert(
      context: context,
      plateNumber: _selectedVehiclePlate!,
      driverName: driver.name,
      totalCylinders: totalCount,
    );
  }

  void _showAllocationSuccessAlert({
    required BuildContext context,
    required String plateNumber,
    required String driverName,
    required int totalCylinders,
  }) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => SafeArea(
        child: Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
            boxShadow: const [
              BoxShadow(
                color: Color(0x1A000000),
                blurRadius: 24,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF2F2),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFFEE2E2)),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.check_circle_rounded,
                        size: 22,
                        color: Color(0xFFDC2626),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Allocation Saved',
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: const Color(0xFF0F172A),
                          ),
                        ),
                        Text(
                          '$plateNumber \u2022 $driverName',
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
              const SizedBox(height: 14),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Stock Allocated',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: const Color(0xFF475569),
                      ),
                    ),
                    Text(
                      '$totalCylinders Cylinders',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: const Color(0xFFDC2626),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: Text(
                    'OK',
                    style: GoogleFonts.inter(
                      fontSize: 14,
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
  }

  // ================= MODERN BOTTOM SHEETS =================
  void _openAddVehicleBottomSheet(BuildContext context, AppState state) {
    final plateController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
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
              const SizedBox(height: 16),
              Text(
                'Add Vehicle',
                style: GoogleFonts.inter(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Vehicle Number',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: plateController,
                autofocus: true,
                textCapitalization: TextCapitalization.characters,
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF0F172A)),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  hintText: 'e.g. KL 55 A 1234',
                  hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 13.5),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFDC2626), width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  onPressed: () {
                    final plate = plateController.text.trim();
                    if (plate.isNotEmpty) {
                      state.addNewVehicle(plateNumber: plate);
                      setState(() => _selectedVehiclePlate = plate.toUpperCase());
                      Navigator.pop(ctx);
                      _showFeedback('Vehicle $plate added');
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    'Add Vehicle',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _openAddDriverBottomSheet(BuildContext context, AppState state) {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    final passController = TextEditingController(text: '1234');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
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
              const SizedBox(height: 16),
              Text(
                'Add Driver',
                style: GoogleFonts.inter(
                  fontSize: 16.5,
                  fontWeight: FontWeight.w800,
                  color: const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 14),
              Text(
                'Driver Name',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 5),
              TextField(
                controller: nameController,
                style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  hintText: 'Enter driver name',
                  hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 13),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFDC2626), width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Phone Number',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 5),
              TextField(
                controller: phoneController,
                keyboardType: TextInputType.phone,
                style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  hintText: 'Enter 10-digit number',
                  hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 13),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFDC2626), width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Login PIN',
                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
              ),
              const SizedBox(height: 5),
              TextField(
                controller: passController,
                style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
                decoration: InputDecoration(
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                  hintText: '4-digit PIN',
                  hintStyle: GoogleFonts.inter(color: const Color(0xFF94A3B8), fontSize: 13),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFDC2626), width: 1.5),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton(
                  onPressed: () {
                    final name = nameController.text.trim();
                    final phone = phoneController.text.trim();
                    final pass = passController.text.trim();
                    if (name.isNotEmpty) {
                      state.addNewDriver(name: name, phone: phone, password: pass);
                      setState(() => _selectedDriverId = state.fleetDrivers.first.id);
                      Navigator.pop(ctx);
                      _showFeedback('Driver $name registered');
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: Text(
                    'Create Driver',
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  // ================= TAB 3: REVENUE =================
  Widget _buildRevenueTab(BuildContext context, AppState state) {
    final totalRevenue = state.adminTotalRevenueToday;
    final totalCash = state.adminTotalCashToday;
    final totalUpi = state.adminTotalUpiToday;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(left: 16, right: 16, top: 6, bottom: 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top Overall Revenue Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(18),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TOTAL COLLECTED TODAY',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '\u20B9${totalRevenue.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontSize: 26,
                    fontWeight: FontWeight.w900,
                    color: const Color(0xFF0F172A),
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 14),

                // Cash & UPI Separate Side-by-Side Cards
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.payments_outlined, size: 18, color: Color(0xFF16A34A)),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Cash Income',
                                  style: GoogleFonts.inter(fontSize: 10.5, fontWeight: FontWeight.w500, color: const Color(0xFF64748B)),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  '\u20B9${totalCash.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                ),
                              ],
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
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.qr_code_2_rounded, size: 18, color: Color(0xFF2563EB)),
                            const SizedBox(width: 8),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'UPI Income',
                                  style: GoogleFonts.inter(fontSize: 10.5, fontWeight: FontWeight.w500, color: const Color(0xFF64748B)),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  '\u20B9${totalUpi.toStringAsFixed(0)}',
                                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                ),
                              ],
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

          const SizedBox(height: 16),

          // Driver-wise List Header
          Text(
            'DRIVER REVENUE & EXPENSES',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 10),

          // Driver-wise Accordion Cards (Showing Balance First)
          ...state.fleetDrivers.map((driver) {
            final isExpanded = _expandedDriverIds.contains(driver.id);
            final isExpenseExpanded = _expandedExpenseDriverIds.contains(driver.id);
            final cash = state.getDriverCashIncome(driver);
            final upi = state.getDriverUpiIncome(driver);
            final total = state.getDriverTotalIncome(driver);
            final expenses = state.getDriverExpenses(driver);
            final totalExp = state.getDriverTotalExpense(driver);
            final balance = state.getDriverNetBalance(driver);

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x06000000),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Tappable Header: Driver Name & Balance First
                  InkWell(
                    onTap: () {
                      setState(() {
                        if (isExpanded) {
                          _expandedDriverIds.remove(driver.id);
                        } else {
                          _expandedDriverIds.add(driver.id);
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.person_rounded,
                            size: 22,
                            color: Color(0xFFDC2626),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  driver.name,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 1),
                                Text(
                                  driver.vehicle.isNotEmpty ? driver.vehicle : 'Unassigned',
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
                                '\u20B9${balance.toStringAsFixed(0)}',
                                style: GoogleFonts.inter(
                                  fontSize: 15.5,
                                  fontWeight: FontWeight.w900,
                                  color: const Color(0xFF16A34A),
                                ),
                              ),
                              const SizedBox(height: 1),
                              Text(
                                'Available Bal',
                                style: GoogleFonts.inter(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 6),
                          Icon(
                            isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                            size: 20,
                            color: const Color(0xFF64748B),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Expandable Dropdown Content
                  if (isExpanded) ...[
                    Container(height: 1, color: const Color(0xFFF1F5F9)),
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Total Collected & Cash/UPI Split
                          Container(
                            padding: const EdgeInsets.all(12),
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
                                      'Total Collected Today',
                                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
                                    ),
                                    Text(
                                      '\u20B9${total.toStringAsFixed(0)}',
                                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                const Divider(height: 1, color: Color(0xFFE2E8F0)),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Cash: \u20B9${cash.toStringAsFixed(0)}',
                                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF16A34A)),
                                    ),
                                    Text(
                                      'UPI: \u20B9${upi.toStringAsFixed(0)}',
                                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: const Color(0xFF2563EB)),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(height: 10),

                          // Expenses Dropdown Section
                          InkWell(
                            onTap: () {
                              setState(() {
                                if (isExpenseExpanded) {
                                  _expandedExpenseDriverIds.remove(driver.id);
                                } else {
                                  _expandedExpenseDriverIds.add(driver.id);
                                }
                              });
                            },
                            borderRadius: BorderRadius.circular(8),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF2F2),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: const Color(0xFFFEE2E2)),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.receipt_long_rounded, size: 15, color: Color(0xFFDC2626)),
                                      const SizedBox(width: 6),
                                      Text(
                                        'Expenses & Fuel (${expenses.length})',
                                        style: GoogleFonts.inter(fontSize: 11.5, fontWeight: FontWeight.w700, color: const Color(0xFFDC2626)),
                                      ),
                                    ],
                                  ),
                                  Row(
                                    children: [
                                      Text(
                                        '-\u20B9${totalExp.toStringAsFixed(0)}',
                                        style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w800, color: const Color(0xFFDC2626)),
                                      ),
                                      const SizedBox(width: 4),
                                      Icon(
                                        isExpenseExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                                        size: 16,
                                        color: const Color(0xFFDC2626),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),

                          if (isExpenseExpanded) ...[
                            const SizedBox(height: 6),
                            if (expenses.isEmpty)
                              Padding(
                                padding: const EdgeInsets.all(6),
                                child: Text(
                                  'No trip expenses recorded',
                                  style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: const Color(0xFF94A3B8)),
                                ),
                              )
                            else
                              ...expenses.map((e) {
                                return Container(
                                  margin: const EdgeInsets.only(bottom: 4),
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFE2E8F0)),
                                  ),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        '${e.title} (${e.paymentMethod})',
                                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF0F172A)),
                                      ),
                                      Text(
                                        '-\u20B9${e.amount.toStringAsFixed(0)}',
                                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: const Color(0xFFDC2626)),
                                      ),
                                    ],
                                  ),
                                );
                              }),
                          ],
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  // ================= TAB 4: INVENTORY REPORTS =================
  Widget _buildReportsTab(BuildContext context, AppState state) {
    final activeDrivers = state.fleetDrivers.where((d) => d.active).toList();
    final totalLoadedOnboard = activeDrivers.fold(0, (sum, d) => sum + d.cylindersOnboard);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(left: 16, right: 16, top: 6, bottom: 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 1. Inventory Summary Card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
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
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'INVENTORY',
                  style: GoogleFonts.inter(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w800,
                    color: const Color(0xFF64748B),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildReportMetricTile(
                        label: 'Stock',
                        value: '${state.totalWarehouseFilled}',
                        icon: Icons.store_rounded,
                        color: const Color(0xFFDC2626),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildReportMetricTile(
                        label: 'Stock Loaded',
                        value: '$totalLoadedOnboard',
                        icon: Icons.local_shipping_rounded,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: _buildReportMetricTile(
                        label: 'Empty Stock',
                        value: '${state.totalWarehouseEmpty}',
                        icon: Icons.propane_tank_outlined,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: _buildReportMetricTile(
                        label: 'Active Drivers',
                        value: '${activeDrivers.length}',
                        icon: Icons.people_alt_rounded,
                        color: const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // 2. Driver Inventory Header
          Text(
            'DRIVER INVENTORY',
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w800,
              color: const Color(0xFF0F172A),
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 10),

          // List of driver inventory report cards
          ...activeDrivers.map((driver) {
            final isExpanded = _expandedReportDriverIds.contains(driver.id);
            final isPrimaryDriver = driver.id == 'DRV-8492' || driver.name.toLowerCase().contains('john');
            final vehiclePlate = driver.vehicle.isNotEmpty ? driver.vehicle : 'KL 77 3803';

            int totalFilledLeft = 0;
            int totalEmptyRet = 0;

            final rowsData = <Map<String, dynamic>>[];

            for (final weight in ['33 KG', '21 KG', '17 KG', '12 KG', '4 KG']) {
              if (isPrimaryDriver) {
                final liveCyl = state.cylinders.firstWhere(
                  (c) => c.weight == weight,
                  orElse: () => CylinderType(weight: weight, price: 0, filledStock: 0, emptyStock: 0),
                );
                final left = liveCyl.filledStock;
                final ret = liveCyl.emptyStock;

                totalFilledLeft += left;
                totalEmptyRet += ret;

                rowsData.add({
                  'weight': weight,
                  'left': left,
                  'ret': ret,
                });
              } else {
                int left;
                int ret;
                if (weight == '17 KG') {
                  left = 20;
                  ret = 4;
                } else if (weight == '12 KG') {
                  left = 8;
                  ret = 2;
                } else if (weight == '21 KG') {
                  left = 5;
                  ret = 1;
                } else if (weight == '4 KG') {
                  left = 4;
                  ret = 2;
                } else {
                  left = 3;
                  ret = 1;
                }

                totalFilledLeft += left;
                totalEmptyRet += ret;

                rowsData.add({
                  'weight': weight,
                  'left': left,
                  'ret': ret,
                });
              }
            }

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
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
              child: Column(
                children: [
                  // Tappable Header
                  InkWell(
                    onTap: () {
                      setState(() {
                        if (isExpanded) {
                          _expandedReportDriverIds.remove(driver.id);
                        } else {
                          _expandedReportDriverIds.add(driver.id);
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.local_shipping_rounded,
                            size: 20,
                            color: Color(0xFFDC2626),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  driver.name,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    color: const Color(0xFF0F172A),
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  vehiclePlate,
                                  style: GoogleFonts.inter(
                                    fontSize: 11.5,
                                    fontWeight: FontWeight.w600,
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
                                '$totalFilledLeft Filled Left',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: const Color(0xFFDC2626),
                                ),
                              ),
                              Text(
                                '$totalEmptyRet Empty Left',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(width: 6),
                          Icon(
                            isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                            size: 20,
                            color: const Color(0xFF64748B),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Expandable Table: ONLY Weight, Filled Left, Empty Left
                  if (isExpanded) ...[
                    Container(height: 1, color: const Color(0xFFF1F5F9)),
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Table Header
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF8FAFC),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  flex: 4,
                                  child: Text(
                                    'Weight',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF64748B),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 4,
                                  child: Text(
                                    'Filled Left',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFFDC2626),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 4,
                                  child: Text(
                                    'Empty Left',
                                    textAlign: TextAlign.center,
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF0F172A),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 4),

                          // Table Rows
                          ...rowsData.map((row) {
                            return Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: const BoxDecoration(
                                border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9), width: 1)),
                              ),
                              child: Row(
                                children: [
                                  Expanded(
                                    flex: 4,
                                    child: Text(
                                      row['weight'] as String,
                                      style: GoogleFonts.inter(
                                        fontSize: 12.5,
                                        fontWeight: FontWeight.w700,
                                        color: const Color(0xFF0F172A),
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 4,
                                    child: Text(
                                      '${row['left']}',
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: const Color(0xFFDC2626),
                                      ),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 4,
                                    child: Text(
                                      '${row['ret']}',
                                      textAlign: TextAlign.center,
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w800,
                                        color: const Color(0xFF0F172A),
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
            );
          }),

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildReportMetricTile({
    required String label,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 8),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w500, color: const Color(0xFF64748B)),
              ),
              Text(
                value,
                style: GoogleFonts.inter(fontSize: 13.5, fontWeight: FontWeight.w800, color: const Color(0xFF0F172A)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}


