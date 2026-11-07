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

    Color iconBg;
    Color iconColor;
    IconData iconData;
    Color borderColor;

    switch (type) {
      case ToastType.success:
        iconBg = const Color(0xFFFDF2F4);
        iconColor = const Color(0xFF800020);
        iconData = Icons.check_circle_rounded;
        borderColor = const Color(0xFF800020);
        break;
      case ToastType.error:
        iconBg = const Color(0xFFFEF2F2);
        iconColor = const Color(0xFFDC2626);
        iconData = Icons.error_outline_rounded;
        borderColor = const Color(0xFFF87171);
        break;
      case ToastType.warning:
        iconBg = const Color(0xFFFFFBEB);
        iconColor = const Color(0xFFD97706);
        iconData = Icons.warning_amber_rounded;
        borderColor = const Color(0xFFFBBF24);
        break;
      case ToastType.info:
        iconBg = const Color(0xFFFDF2F4);
        iconColor = const Color(0xFF800020);
        iconData = Icons.info_outline_rounded;
        borderColor = const Color(0xFF800020);
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
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: borderColor, width: 1.2),
            boxShadow: const [
              BoxShadow(
                color: Color(0x18800020),
                blurRadius: 14,
                offset: Offset(0, 4),
              ),
              BoxShadow(
                color: Color(0x080F172A),
                blurRadius: 4,
                offset: Offset(0, 1),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 30,
                height: 30,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Center(
                  child: Icon(iconData, color: iconColor, size: 18),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  message,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0F172A),
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

  static void success(BuildContext context, String message, {Duration duration = const Duration(seconds: 3)}) {
    show(context, message, type: ToastType.success, duration: duration);
  }

  static void error(BuildContext context, String message, {Duration duration = const Duration(seconds: 3)}) {
    show(context, message, type: ToastType.error, duration: duration);
  }

  static void info(BuildContext context, String message, {Duration duration = const Duration(seconds: 3)}) {
    show(context, message, type: ToastType.info, duration: duration);
  }

  static void warning(BuildContext context, String message, {Duration duration = const Duration(seconds: 3)}) {
    show(context, message, type: ToastType.warning, duration: duration);
  }
}
