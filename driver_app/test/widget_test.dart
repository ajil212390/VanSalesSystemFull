import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:supergas_driver/providers/app_state.dart';
import 'package:supergas_driver/screens/login_screen.dart';

void main() {
  group('AppState Unit Tests', () {
    test('Initial AppState has correct default state', () {
      final state = AppState();
      expect(state.isLoadingFromBackend, false);
      expect(state.cylinders, isEmpty);
      expect(state.orders, isEmpty);
      expect(state.expenses, isEmpty);
      expect(state.splitCashAmount, 0.0);
      expect(state.splitUpiAmount, 0.0);
    });

    test('AppState.setSplitAmounts updates state properly', () {
      final state = AppState();
      state.setSplitAmounts(1500.0, 1660.0);
      expect(state.splitCashAmount, 1500.0);
      expect(state.splitUpiAmount, 1660.0);
    });

    test('AppState financial computations correctly sum cash and upi', () {
      final state = AppState();
      final customer = Customer(name: 'Test Customer', phone: '9876543210');
      final cylinder = CylinderType(weight: '12KG', price: 700.0, filledStock: 10);
      final item = DeliveryItem(cylinder: cylinder, deliveryQty: 2);

      // Add Cash Order
      state.orders.add(
        DeliveryOrder(
          ticketId: 'TKT-001',
          customer: customer,
          items: [item],
          totalCylinders: 2,
          totalEmpties: 2,
          amount: 1400.0,
          paymentMethod: 'Cash',
          time: '10:00 AM',
        ),
      );

      // Add UPI Order
      state.orders.add(
        DeliveryOrder(
          ticketId: 'TKT-002',
          customer: customer,
          items: [item],
          totalCylinders: 1,
          totalEmpties: 1,
          amount: 700.0,
          paymentMethod: 'UPI',
          time: '10:30 AM',
        ),
      );

      expect(state.orders.length, 2);
      expect(state.cashIncome, 1400.0);
      expect(state.upiIncome, 700.0);
      expect(state.totalIncome, 2100.0);
      expect(state.netBalance, 2100.0);
    });
  });

  group('LoginScreen Widget Tests', () {
    testWidgets('LoginScreen renders UI correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: const LoginScreen(),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // Check header and titles
      expect(find.text('FUTURE GAS'), findsOneWidget);
      expect(find.text('VAN SALES & DISTRIBUTION'), findsOneWidget);
      expect(find.text('SIGN IN'), findsOneWidget);

      // Check input fields
      expect(find.text('USERNAME'), findsOneWidget);
      expect(find.text('PASSWORD'), findsOneWidget);

      // Check Sign In button
      expect(find.widgetWithText(ElevatedButton, 'Sign In'), findsOneWidget);
    });
  });
}
