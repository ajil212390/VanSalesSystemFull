import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

enum ToastType { success, error, info, warning }

class AppToast {
  static void show(
    BuildContext context,
    String message, {
    ToastType type = ToastType.info,
    Duration duration = const Duration(seconds: 3),
  }) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();

    Color iconColor;
    IconData iconData;

    switch (type) {
      case ToastType.success:
        iconColor = const Color(0xFF10B981); // Emerald
        iconData = Icons.check_circle_rounded;
        break;
      case ToastType.error:
        iconColor = const Color(0xFFEF4444); // Red
        iconData = Icons.error_rounded;
        break;
      case ToastType.warning:
        iconColor = const Color(0xFFF59E0B); // Amber
        iconData = Icons.warning_rounded;
        break;
      case ToastType.info:
        iconColor = const Color(0xFF38BDF8); // Sky
        iconData = Icons.info_rounded;
        break;
    }

    messenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        elevation: 0,
        backgroundColor: Colors.transparent,
        duration: duration,
        padding: EdgeInsets.zero,
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        content: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A), // Dark slate
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF334155), width: 1),
            boxShadow: const [
              BoxShadow(
                color: Color(0x33000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Icon(iconData, color: iconColor, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                    height: 1.3,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static void success(BuildContext context, String message) {
    show(context, message, type: ToastType.success);
  }

  static void error(BuildContext context, String message) {
    show(context, message, type: ToastType.error);
  }

  static void info(BuildContext context, String message) {
    show(context, message, type: ToastType.info);
  }

  static void warning(BuildContext context, String message) {
    show(context, message, type: ToastType.warning);
  }
}
