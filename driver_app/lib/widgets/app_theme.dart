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
          color: isDark
              ? Colors.black.withValues(alpha: 0.55)
              : const Color(0xFF0F172A).withValues(alpha: 0.08),
          blurRadius: 20,
          offset: const Offset(0, 8),
          spreadRadius: -2,
        ),
        BoxShadow(
          color: isDark
              ? Colors.black.withValues(alpha: 0.35)
              : const Color(0xFF0F172A).withValues(alpha: 0.04),
          blurRadius: 6,
          offset: const Offset(0, 2),
          spreadRadius: 0,
        ),
      ],
    );
  }
}
