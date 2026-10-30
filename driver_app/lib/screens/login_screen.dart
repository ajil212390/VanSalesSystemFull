import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'admin_screen.dart';
import 'home_shell.dart';
import '../widgets/smooth_transitions.dart';
import '../services/api_service.dart';
import '../providers/app_state.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _idController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    ApiService.init().then((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _idController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showFeedback(String message, {bool isError = true}) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600),
        ),
        backgroundColor: isError ? const Color(0xFF800020) : const Color(0xFF1E293B),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  Future<void> _login() async {
    final id = _idController.text.trim();
    final pass = _passwordController.text.trim();

    if (id.isEmpty) {
      _showFeedback('Please enter your username');
      return;
    }
    if (pass.isEmpty) {
      _showFeedback('Please enter your password');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final res = await ApiService.login(id, pass);

      if (!mounted) return;

      if (res['success'] == true) {
        final state = AppStateProvider.of(context);
        final userData = res['data']?['user'] as Map<String, dynamic>?;
        final driverId = userData?['driver_id'] as int?;
        final role = userData?['role']?.toString().toLowerCase() ?? '';

        // Hydrate live data from backend (allocated van, onboard cylinders, customers)
        await state.syncFromBackend(driverIdParam: driverId);
        if (!mounted) return;

        setState(() => _isLoading = false);

        final isAdminRole = role.contains('admin') || role.contains('manager');
        if (isAdminRole) {
          Navigator.pushReplacement(
            context,
            SmoothPageRoute(page: const AdminScreen()),
          );
        } else {
          Navigator.pushReplacement(
            context,
            SmoothPageRoute(page: const HomeShell()),
          );
        }
      } else {
        setState(() => _isLoading = false);
        _showFeedback(res['message'] ?? 'Login failed. Please check credentials.');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      _showFeedback('Could not connect to server ($e)');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          child: Align(
            alignment: Alignment.topCenter,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 380),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 48),

                  // Brand Title matching Web App (No icons, pure minimal typography)
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'FUTURE GAS',
                          style: GoogleFonts.inter(
                            fontSize: 28,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.4,
                            color: const Color(0xFF800020),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'VAN SALES & DISTRIBUTION',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.8,
                            color: const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Section Title
                  Text(
                    'SIGN IN',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      color: const Color(0xFF800020),
                      letterSpacing: 0.8,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Enter your staff login to start your delivery shift.',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: const Color(0xFF64748B),
                    ),
                  ),

                  const SizedBox(height: 22),

                  // Username Field
                  Text(
                    'USERNAME',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF475569),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _idController,
                    textInputAction: TextInputAction.next,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF0F172A),
                    ),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      hintText: 'Enter username',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xFF94A3B8),
                      ),
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
                        borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),

                  const SizedBox(height: 18),

                  // Password Field
                  Text(
                    'PASSWORD',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF475569),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    onSubmitted: (_) => _login(),
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: const Color(0xFF0F172A),
                    ),
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                      hintText: 'Enter password',
                      hintStyle: GoogleFonts.inter(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w400,
                        color: const Color(0xFF94A3B8),
                      ),
                      suffixIcon: TextButton(
                        onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                        child: Text(
                          _obscurePassword ? 'Show' : 'Hide',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF800020),
                          ),
                        ),
                      ),
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
                        borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    ),
                  ),

                  const SizedBox(height: 26),

                  // Sign In Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _login,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF800020),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      child: _isLoading
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            )
                          : Text(
                              'Sign In',
                              style: GoogleFonts.inter(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                                letterSpacing: 0.2,
                              ),
                            ),
                    ),
                  ),

                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
