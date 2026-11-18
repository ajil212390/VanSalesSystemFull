import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/confirm_dialog.dart';
import '../widgets/app_toast.dart';
import '../providers/app_state.dart';
import 'home_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';
import 'add_delivery_screen.dart';

class HomeShell extends StatefulWidget {
  final int initialIndex;

  const HomeShell({super.key, this.initialIndex = 0});

  static void switchTab(BuildContext context, int index) {
    final state = context.findAncestorStateOfType<_HomeShellState>();
    if (state != null) {
      state._switchToTab(index);
    }
  }

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  late int _currentIndex;

  void _switchToTab(int index) {
    if (index == 1) {
      final state = AppStateProvider.of(context);
      if (state.isShiftLocked || state.endShiftStatus.toUpperCase() != 'ACTIVE') {
        AppToast.error(context, 'Shift ended. Awaiting approval or new load allocation.');
        return;
      }
    }
    setState(() => _currentIndex = index);
  }

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      // Auto-refresh shift and stock data instantly when returning from background
      AppStateProvider.of(context).syncFromBackend();
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        if (_currentIndex != 0) {
          setState(() => _currentIndex = 0);
          return;
        }
        final shouldExit = await showSuperGasConfirmDialog(
          context: context,
          title: 'Exit Future Gas?',
          message: 'Are you sure you want to exit the app? Your active route and shift progress remain securely synchronized.',
          confirmLabel: 'Exit App',
          icon: Icons.power_settings_new_rounded,
          iconColor: const Color(0xFF800020),
          iconBgColor: const Color(0xFFFDF2F4),
          confirmButtonColor: const Color(0xFF800020),
        );
        if (shouldExit == true && context.mounted) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF1F5F9),
        body: Stack(
          children: [
            Positioned.fill(
              child: IndexedStack(
                index: _currentIndex,
                children: const [
                  HomeScreen(),
                  AddDeliveryScreen(),
                  OrdersScreen(),
                  ProfileScreen(),
                ],
              ),
            ),
            if (MediaQuery.of(context).viewInsets.bottom == 0) ...[
              // Responsive bottom padding for classic 3-button navigation vs gesture navigation
              Builder(
                builder: (context) {
                  final bottomPadding = MediaQuery.of(context).padding.bottom;
                  // On devices with classic 3-button navigation (bottomPadding > 24),
                  // use a 6px offset so the navbar sits right above the system buttons without jumping too high.
                  final double navBottomOffset = bottomPadding > 24 ? (bottomPadding + 6) : (bottomPadding + 10);

                  return Stack(
                    children: [
                      // White gradient shade blending upwards behind floating pill navbar
                      Positioned(
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: navBottomOffset + 76,
                        child: IgnorePointer(
                          child: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.bottomCenter,
                                end: Alignment.topCenter,
                                colors: [
                                  Color(0xE6FFFFFF),
                                  Color(0x80FFFFFF),
                                  Color(0x00FFFFFF),
                                ],
                                stops: [0.0, 0.55, 1.0],
                              ),
                            ),
                          ),
                        ),
                      ),

                      // Floating Pill Navbar
                      Positioned(
                        left: 16,
                        right: 16,
                        bottom: navBottomOffset,
                        child: Container(
                          height: 62,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(28),
                            border: Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                            boxShadow: const [
                              BoxShadow(
                                color: Color(0x0F0F172A),
                                blurRadius: 8,
                                offset: Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _navItem(
                                selectedIcon: Icons.home_rounded,
                                unselectedIcon: Icons.home_outlined,
                                label: 'Home',
                                index: 0,
                              ),
                              _navItem(
                                selectedIcon: Icons.local_shipping_rounded,
                                unselectedIcon: Icons.local_shipping_outlined,
                                label: 'Delivery',
                                index: 1,
                              ),
                              _navItem(
                                selectedIcon: Icons.receipt_long_rounded,
                                unselectedIcon: Icons.receipt_long_outlined,
                                label: 'Sales',
                                index: 2,
                              ),
                              _navItem(
                                selectedIcon: Icons.person_rounded,
                                unselectedIcon: Icons.person_outline_rounded,
                                label: 'Profile',
                                index: 3,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _navItem({
    required IconData selectedIcon,
    required IconData unselectedIcon,
    required String label,
    required int index,
    VoidCallback? onTapOverride,
  }) {
    final isSelected = _currentIndex == index;
    const activeColor = Color(0xFF800020); // Burgundy color when active
    const inactiveColor = Color(0xFF64748B); // Slate grey when inactive

    return Expanded(
      child: InkWell(
        onTap: () {
          if (onTapOverride != null) {
            onTapOverride();
          } else {
            setState(() => _currentIndex = index);
            AppStateProvider.of(context).syncFromBackend();
          }
        },
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
}
