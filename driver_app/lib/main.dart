import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'screens/login_screen.dart';
import 'providers/app_state.dart';

import 'widgets/smooth_transitions.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const SuperGasApp());
}

class SuperGasApp extends StatefulWidget {
  const SuperGasApp({super.key});

  @override
  State<SuperGasApp> createState() => _SuperGasAppState();
}

class _SuperGasAppState extends State<SuperGasApp> {
  final appState = AppState();

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: appState,
      builder: (context, _) {
        return AppStateProvider(
          state: appState,
          child: MaterialApp(
            title: 'SUPERGAS',
            debugShowCheckedModeBanner: false,
            theme: ThemeData(
              useMaterial3: true,
              pageTransitionsTheme: const PageTransitionsTheme(
                builders: {
                  TargetPlatform.android: SmoothPageTransitionsBuilder(),
                  TargetPlatform.iOS: SmoothPageTransitionsBuilder(),
                  TargetPlatform.windows: SmoothPageTransitionsBuilder(),
                  TargetPlatform.macOS: SmoothPageTransitionsBuilder(),
                  TargetPlatform.linux: SmoothPageTransitionsBuilder(),
                },
              ),
              colorScheme: ColorScheme.fromSeed(
                seedColor: const Color(0xFF800020),
                primary: const Color(0xFF800020),
                brightness: Brightness.light,
              ),
              scaffoldBackgroundColor: const Color(0xFFF8FAFC),
              fontFamily: 'Plus Jakarta Sans',
              appBarTheme: const AppBarTheme(
                backgroundColor: Colors.white,
                foregroundColor: Color(0xFF0F172A),
                elevation: 0,
                scrolledUnderElevation: 0,
                centerTitle: true,
                titleTextStyle: TextStyle(
                  color: Color(0xFF0F172A),
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'Plus Jakarta Sans',
                  letterSpacing: -0.2,
                ),
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF800020),
                  foregroundColor: Colors.white,
                  minimumSize: const Size(64, 48),
                  elevation: 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  textStyle: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    fontFamily: 'Plus Jakarta Sans',
                    letterSpacing: 0.2,
                  ),
                ),
              ),
              inputDecorationTheme: InputDecorationTheme(
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF800020), width: 1.8),
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
              ),
              cardTheme: CardThemeData(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                  side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
                ),
                color: Colors.white,
              ),
            ),
            home: const LoginScreen(),
          ),
        );
      },
    );
  }
}
