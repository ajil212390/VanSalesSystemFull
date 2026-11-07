import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'admin_screen.dart';
import 'home_shell.dart';
import '../widgets/smooth_transitions.dart';
import '../services/api_service.dart';
import '../providers/app_state.dart';

import '../widgets/app_toast.dart';

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
    _checkExistingSession();
  }

  Future<void> _checkExistingSession() async {
    await ApiService.init();
    final token = await ApiService.getToken();
    final refreshToken = await ApiService.getRefreshToken();
    final user = await ApiService.getSavedUser();

    if ((token != null && token.isNotEmpty) || (refreshToken != null && refreshToken.isNotEmpty)) {
      if (user != null && mounted) {
        final state = AppStateProvider.of(context);
        final driverId = (user['driver_id'] ?? user['DriverId']) as int?;

        // Proactively refresh access token if possible so user never faces stale session
        ApiService.refreshAccessToken().then((_) {
          if (mounted) {
            state.syncFromBackend(driverIdParam: driverId);
          }
        });

        // Trigger synchronization without blocking transition
        state.syncFromBackend(driverIdParam: driverId);

        final role = user['role']?.toString().toLowerCase() ?? '';
        final isAdminRole = role.contains('admin') || role.contains('manager');
        Navigator.pushReplacement(
          context,
          SmoothPageRoute(page: isAdminRole ? const AdminScreen() : const HomeShell()),
        );
        return;
      }
    }
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _idController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _showFeedback(String message, {bool isError = true}) {
    if (isError) {
      AppToast.error(context, message);
    } else {
      AppToast.success(context, message);
    }
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


  void _showServerConfigDialog() {
    final serverController = TextEditingController(text: ApiService.baseUrl);
    bool isTesting = false;
    String? testResult;
    bool testSuccess = false;

    showDialog(
      context: context,
      builder: (dialogCtx) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              titlePadding: const EdgeInsets.fromLTRB(20, 20, 20, 8),
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              actionsPadding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              title: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2F4),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.dns_outlined, size: 20, color: Color(0xFF800020)),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    'Server Connection',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '',
                      style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'API BASE URL',
                      style: GoogleFonts.inter(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: const Color(0xFF800020),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: serverController,
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
                      decoration: InputDecoration(
                        hintText: 'https://z0v56js5-8000.inc1.devtunnels.ms//api/v1',
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
                          borderSide: const BorderSide(color: Color(0xFF800020), width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        OutlinedButton.icon(
                          onPressed: isTesting
                              ? null
                              : () async {
                                  setDialogState(() {
                                    isTesting = true;
                                    testResult = null;
                                  });
                                  try {
                                    final testUrl = serverController.text.trim().replaceAll(RegExp(r'/+$'), '');
                                    final uri = Uri.parse("$testUrl/auth/login/");
                                    final res = await http.post(
                                      uri,
                                      headers: {'Content-Type': 'application/json'},
                                      body: jsonEncode({'username': 'ping', 'password': 'x'}),
                                    ).timeout(const Duration(seconds: 4));
                                    setDialogState(() {
                                      isTesting = false;
                                      testSuccess = true;
                                      testResult = "Server reachable! (HTTP ${res.statusCode})";
                                    });
                                  } catch (err) {
                                    setDialogState(() {
                                      isTesting = false;
                                      testSuccess = false;
                                      testResult = "Connection failed: $err";
                                    });
                                  }
                                },
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFF800020),
                            side: const BorderSide(color: Color(0xFF800020)),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          ),
                          icon: isTesting
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF800020)),
                                )
                              : const Icon(Icons.wifi_tethering, size: 16),
                          label: Text(
                            isTesting ? 'Testing...' : 'Test Ping',
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                        const SizedBox(width: 8),
                        TextButton(
                          onPressed: () {
                            serverController.text = 'https://z0v56js5-8000.inc1.devtunnels.ms//api/v1';
                          },
                          child: Text(
                            'Reset Default',
                            style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF64748B)),
                          ),
                        ),
                      ],
                    ),
                    if (testResult != null) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: testSuccess ? const Color(0xFFF0FDF4) : const Color(0xFFFDF2F4),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: testSuccess ? const Color(0xFFBBF7D0) : const Color(0xFFF5C2CB),
                          ),
                        ),
                        child: Text(
                          testResult!,
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w500,
                            color: testSuccess ? const Color(0xFF166534) : const Color(0xFF800020),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(dialogCtx),
                  child: Text(
                    'Cancel',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
                  ),
                ),
                ElevatedButton(
                  onPressed: () async {
                    final target = serverController.text.trim();
                    Navigator.pop(dialogCtx);
                    if (target.isNotEmpty) {
                      await ApiService.setBaseUrl(target);
                      if (mounted) {
                        setState(() {});
                        _showFeedback('Server URL set to ', isError: false);
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF800020),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text('Save', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                ),
              ],
            );
          },
        );
      },
    );
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      InkWell(
                        onTap: _showServerConfigDialog,
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.settings_ethernet, size: 14, color: Color(0xFF64748B)),
                              const SizedBox(width: 6),
                              Text(
                                'Server IP',
                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: const Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

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
