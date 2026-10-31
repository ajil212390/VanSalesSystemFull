import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';
import '../widgets/confirm_dialog.dart';
import '../widgets/smooth_transitions.dart';
import 'login_screen.dart';
import '../providers/app_state.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF1F5F9),
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        centerTitle: false,
        toolbarHeight: 52,
        titleSpacing: Navigator.canPop(context) ? 0 : 20,
        leading: Navigator.canPop(context)
            ? IconButton(
                icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Color(0xFF0F172A)),
                onPressed: () => Navigator.pop(context),
              )
            : null,
        title: Text(
          'Driver Profile',
          style: GoogleFonts.inter(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: const Color(0xFF0F172A),
            letterSpacing: -0.5,
          ),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // 1. UNIFIED EXECUTIVE DRIVER & VEHICLE PROFILE CARD
              _buildUnifiedDriverCard(context, state),

              const SizedBox(height: 20),

              // 2. DISPATCH & SUPPORT
              _buildSectionTitle('SERVICES & DISPATCH'),
              const SizedBox(height: 10),

              _buildMenuCard(
                icon: Icons.phone_in_talk_rounded,
                title: 'Central Dispatch Support',
                subtitle: '24/7 Helpline: 1234567890',
                onTap: _callDispatchSupport,
              ),
              const SizedBox(height: 20),

              // 3. END SHIFT & LOGOUT ACTION
              Container(
                width: double.infinity,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x0E0F172A),
                      blurRadius: 10,
                      offset: Offset(0, 3),
                    ),
                    BoxShadow(
                      color: Color(0x060F172A),
                      blurRadius: 3,
                      offset: Offset(0, 1),
                    ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(12),
                    onTap: () => _confirmLogout(context, state),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(
                          Icons.logout_rounded,
                          size: 18,
                          color: Color(0xFFDC2626),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'End Shift & Logout',
                          style: GoogleFonts.inter(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFFDC2626),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),

              const SizedBox(height: 90),
            ],
          ),
        ),
      ),
    );
  }

  // Section Title
  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: GoogleFonts.inter(
        fontSize: 11,
        fontWeight: FontWeight.w800,
        color: const Color(0xFF64748B),
        letterSpacing: 0.8,
      ),
    );
  }

  // 1. UNIFIED DRIVER & VEHICLE CARD
  Widget _buildUnifiedDriverCard(BuildContext context, AppState state) {
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
      child: Column(
        children: [
          // Top Half: Driver Profile Row
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                // Driver Avatar 'JO' in SuperGas Red Gradient
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(
                    color: Color(0xFF991B1B),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      'JO',
                      style: GoogleFonts.inter(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 18,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),

                // Driver Information
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              state.fullName,
                              style: GoogleFonts.inter(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                            ),
                            child: Text(
                              state.driverId,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Row(
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: Color(0xFF16A34A),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            'Shift Active \u2022 On Duty',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: const Color(0xFF16A34A),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Divider
          const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),

          // Bottom Half: Assigned Truck Row
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
            decoration: const BoxDecoration(
              color: Color(0xFFFAFAFA),
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(15),
                bottomRight: Radius.circular(15),
              ),
            ),
            child: Row(
              children: [
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: Center(
                    child: Icon(
                      Icons.local_shipping_rounded,
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
                        state.vehicleNumber,
                        style: GoogleFonts.inter(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w800,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${state.truckStock} Full Cylinders \u2022 ${state.totalEmptyStock} Empty Returns',
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
          ),
        ],
      ),
    );
  }

  // 2. MENU TILE
  Widget _buildMenuCard({
    required IconData icon,
    required String title,
    required String subtitle,
    Widget? trailing,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            boxShadow: const [
              BoxShadow(
                color: Color(0x0D0F172A),
                blurRadius: 12,
                offset: Offset(0, 3),
              ),
              BoxShadow(
                color: Color(0x060F172A),
                blurRadius: 3,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Row(
            children: [
              SizedBox(
                width: 28,
                height: 28,
                child: Center(
                  child: Icon(icon, size: 22, color: const Color(0xFFDC2626)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 2),
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
              ),
              ?trailing,
            ],
          ),
        ),
      ),
    );
  }

  // Dial Dispatch Support Number
  Future<void> _callDispatchSupport() async {
    final Uri launchUri = Uri(
      scheme: 'tel',
      path: '1234567890',
    );
    try {
      if (await canLaunchUrl(launchUri)) {
        await launchUrl(launchUri);
      } else {
        await launchUrl(launchUri, mode: LaunchMode.externalApplication);
      }
    } catch (_) {}
  }

  // Logout confirmation modal
  Future<void> _confirmLogout(BuildContext context, AppState state) async {
    final confirmed = await showSuperGasConfirmDialog(
      context: context,
      title: 'End Shift & Logout?',
      message: 'Are you sure you want to end your shift and logout? All delivery records are synchronized with the depot.',
      confirmLabel: 'End Shift & Logout',
      icon: Icons.logout_rounded,
      confirmButtonColor: const Color(0xFFDC2626),
      extraContent: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${state.todayDeliveredCount} Delivered',
              style: GoogleFonts.inter(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: const Color(0xFF0F172A),
              ),
            ),
            Text(
              '\u20B9${state.todayCollectedTotal.toStringAsFixed(0)} Settled',
              style: GoogleFonts.inter(
                fontSize: 11.5,
                fontWeight: FontWeight.w800,
                color: const Color(0xFFDC2626),
              ),
            ),
          ],
        ),
      ),
    );

    if (confirmed == true && context.mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        SmoothPageRoute(page: const LoginScreen()),
        (route) => false,
      );
    }
  }
}
