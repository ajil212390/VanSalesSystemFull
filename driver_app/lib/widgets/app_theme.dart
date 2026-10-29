import 'package:flutter/material.dart';

class AppTheme {
  static Color scaffoldBg(bool isDark) =>
      isDark ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9);

  static Color cardBg(bool isDark) =>
      isDark ? const Color(0xFF1E293B) : Colors.white;

  static Color innerBoxBg(bool isDark) =>
      isDark ? const Color(0xFF334155) : const Color(0xFFF8FAFC);

  static Color textPrimary(bool isDark) =>
      isDark ? const Color(0xFFF8FAFC) : const Color(0xFF0F172A);

  static Color textSecondary(bool isDark) =>
      isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

  static BoxDecoration glassCardDecoration(
    bool isDark, {
    double radius = 16,
    Color? borderColor,
    Color? customColor,
  }) {
    return BoxDecoration(
      color: customColor ?? (isDark ? const Color(0xFF1E293B) : Colors.white),
      borderRadius: BorderRadius.circular(radius),
      border: Border.all(
        color: borderColor ?? (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
        width: 1,
      ),
      boxShadow: [
        BoxShadow(
          color: Color.fromRGBO(0, 0, 0, isDark ? 0.2 : 0.03),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ],
    );
  }
}
