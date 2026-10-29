import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/confirm_dialog.dart';
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

class _HomeShellState extends State<HomeShell> {
  late int _currentIndex;

  void _switchToTab(int index) {
    setState(() => _currentIndex = index);
  }

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
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
          title: 'Exit SuperGas?',
          message: 'Are you sure you want to exit the app? Your active route and shift progress remain securely synchronized.',
          confirmLabel: 'Exit App',
          icon: Icons.power_settings_new_rounded,
          iconColor: const Color(0xFFE11D48),
          iconBgColor: const Color(0xFFFFE4E6),
          confirmButtonColor: const Color(0xFFE11D48),
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
              // Subtle short bottom white shade blending upwards from screen bottom
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                height: 38 + MediaQuery.of(context).padding.bottom,
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
                bottom: 12 + MediaQuery.of(context).padding.bottom,
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
                        selectedIcon: Icons.assignment_rounded,
                        unselectedIcon: Icons.assignment_outlined,
                        label: 'Orders',
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
    const activeColor = Color(0xFFDC2626); // Red color when active
    const inactiveColor = Color(0xFF64748B); // Slate grey when inactive

    return Expanded(
      child: InkWell(
        onTap: () {
          if (onTapOverride != null) {
            onTapOverride();
          } else {
            setState(() => _currentIndex = index);
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
