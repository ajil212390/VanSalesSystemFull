import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supergas_driver/main.dart';
import 'package:supergas_driver/screens/home_shell.dart';
import 'package:supergas_driver/screens/home_screen.dart';
import 'package:supergas_driver/screens/profile_screen.dart';
import 'package:supergas_driver/screens/orders_screen.dart';

void main() {
  testWidgets('App renders login screen and driver dashboard correctly', (WidgetTester tester) async {
    await tester.pumpWidget(const SuperGasApp());
    await tester.pump(const Duration(milliseconds: 300));

    // 1. Check Login Screen header elements
    expect(find.text('SUPERGAS'), findsOneWidget);
    expect(find.text('Driver (DRV001)'), findsOneWidget);

    // 2. Sign In to Driver Dashboard
    final signInBtn = find.text('Sign In as Driver');
    expect(signInBtn, findsOneWidget);
    await tester.tap(signInBtn);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pump(const Duration(milliseconds: 500));

    // 3. Should render HomeShell & HomeScreen widgets
    expect(find.byType(HomeShell), findsOneWidget);
    expect(find.byType(HomeScreen), findsOneWidget);

    // 4. Verify Driver Dashboard components
    expect(find.text('JO'), findsOneWidget);
    expect(find.text('KL 77 3803'), findsOneWidget);
    expect(find.text('STOCK FILLED'), findsOneWidget);
    expect(find.text('EMPTY'), findsOneWidget);
    expect(find.text('INVENTORY'), findsOneWidget);
    expect(find.text('Weight (KG)'), findsOneWidget);
    expect(find.textContaining('INCOME'), findsOneWidget);
    expect(find.textContaining('EXPENSES'), findsOneWidget);
    expect(find.text('BALANCE'), findsOneWidget);

    // Test expanding income and opening history
    await tester.ensureVisible(find.textContaining('INCOME'));
    await tester.tap(find.textContaining('INCOME'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.text('CASH'), findsOneWidget);
    expect(find.text('UPI'), findsOneWidget);

    // Test opening History modal
    await tester.ensureVisible(find.text('History'));
    await tester.tap(find.text('History'));
    await tester.pumpAndSettle();
    expect(find.text('Trip Expenses History'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.close));
    await tester.pumpAndSettle();

    // 5. Test switching to Delivery tab
    await tester.tap(find.text('Delivery'));
    await tester.pump(const Duration(milliseconds: 300));

    // 6. Test switching to Orders tab
    await tester.tap(find.text('Orders'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(OrdersScreen), findsOneWidget);

    // 7. Test switching to Profile tab
    await tester.tap(find.text('Profile'));
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byType(ProfileScreen), findsOneWidget);
  });
}
