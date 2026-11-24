import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

/// Robust numeric parsing helpers to prevent TypeError between num, int, double, and string
double safeDouble(dynamic val, [double fallback = 0.0]) {
  if (val == null) return fallback;
  if (val is double) return val;
  if (val is int) return val.toDouble();
  return double.tryParse(val.toString()) ?? fallback;
}

int safeInt(dynamic val, [int fallback = 0]) {
  if (val == null) return fallback;
  if (val is int) return val;
  if (val is double) return val.toInt();
  final s = val.toString().trim();
  final d = double.tryParse(s);
  if (d != null) return d.toInt();
  return int.tryParse(s) ?? fallback;
}

int? safeIntNullable(dynamic val) {
  if (val == null) return null;
  return safeInt(val);
}

double? safeDoubleNullable(dynamic val) {
  if (val == null) return null;
  return safeDouble(val);
}

/// Data models and app state management
class CylinderType {
  final int? productId;
  final String weight;
  final double price;
  final double gstPercentage;
  final String hsnCode;
  int initialFilledStock;
  int filledStock;
  int emptyStock;

  CylinderType({
    this.productId,
    required this.weight,
    required this.price,
    required this.filledStock,
    this.gstPercentage = 0.0,
    this.hsnCode = '271109',
    int? initialFilledStock,
    this.emptyStock = 0,
  }) : initialFilledStock = initialFilledStock ?? filledStock;

  int get deliveredStock {
    final diff = initialFilledStock - filledStock;
    return diff > 0 ? diff : 0;
  }
}

class OtherProductItem {
  final int? productId;
  final String name;
  double price;
  final double gstPercentage;
  final String categoryName;
  int initialStock;
  int deliveredStock;
  int balanceStock;

  OtherProductItem({
    this.productId,
    required this.name,
    required this.price,
    this.gstPercentage = 0.0,
    this.categoryName = 'Other Items',
    required this.initialStock,
    this.deliveredStock = 0,
    int? balanceStock,
  }) : balanceStock = balanceStock ?? (initialStock - deliveredStock);
}

class Customer {
  final int? ledgerId;
  final String name;
  final String phone;
  final String address;
  final String? shopId;
  final String type; // Regular, Premium, etc.
  final double creditLimit;
  final int creditPeriodDays;
  final double emptyStockLimit;
  double outstanding;
  final int? routeId;
  final String? routeName;

  Customer({
    this.ledgerId,
    required this.name,
    required this.phone,
    this.address = '',
    this.shopId,
    this.type = 'Regular',
    this.creditLimit = 15000,
    this.creditPeriodDays = 15,
    this.emptyStockLimit = 0,
    this.outstanding = 0,
    this.routeId,
    this.routeName,
  });
}

class DeliveryItem {
  final CylinderType cylinder;
  int deliveryQty;
  int emptyReturnQty;

  DeliveryItem({
    required this.cylinder,
    this.deliveryQty = 0,
    this.emptyReturnQty = 0,
  });
}

class DeliveryOrder {
  String ticketId;
  int? salesId;
  final Customer customer;
  final List<DeliveryItem> items;
  final int totalCylinders;
  final int totalEmpties;
  final double amount;
  final double? billTotal;
  final String paymentMethod;
  final double? cashAmount;
  final double? upiAmount;
  final String time;
  final String status;
  final int stopNumber;

  DeliveryOrder({
    required this.ticketId,
    this.salesId,
    required this.customer,
    required this.items,
    required this.totalCylinders,
    required this.totalEmpties,
    required this.amount,
    this.billTotal,
    required this.paymentMethod,
    this.cashAmount,
    this.upiAmount,
    required this.time,
    this.status = 'Delivered',
    this.stopNumber = 1,
  });

  double get totalBillValue => (billTotal != null && billTotal! > 0) ? billTotal! : amount;

  double get pendingBalance {
    if (paymentMethod.toUpperCase() == 'CREDIT') {
      return totalBillValue;
    }
    final bal = totalBillValue - amount;
    return bal > 0.01 ? bal : 0.0;
  }

  String get cylinderSummary {
    final parts = items
        .where((i) => i.deliveryQty > 0)
        .map((i) => '${i.cylinder.weight} \u00D7 ${i.deliveryQty}')
        .toList();
    return parts.join(', ');
  }

  String get emptiesSummary {
    final parts = items
        .where((i) => i.emptyReturnQty > 0)
        .map((i) => '${i.cylinder.weight} \u00D7 ${i.emptyReturnQty}')
        .toList();
    return parts.join(', ');
  }
}

class DriverExpense {
  String id;
  final String title;
  final double amount;
  final String paymentMethod; // 'Cash' or 'UPI'
  final String time;

  DriverExpense({
    required this.id,
    required this.title,
    required this.amount,
    required this.paymentMethod,
    required this.time,
  });
}

class AdminDriver {
  final String id;
  final String name;
  String vehicle;
  final String phone;
  final String password;
  bool active;
  int deliveries;
  String route;
  int cylindersOnboard;
  Map<String, int> stockAllocation;
  double mockCashIncome;
  double mockUpiIncome;
  List<DriverExpense> mockExpenses;

  AdminDriver({
    required this.id,
    required this.name,
    required this.vehicle,
    required this.phone,
    this.password = '1234',
    this.active = true,
    this.deliveries = 0,
    required this.route,
    this.cylindersOnboard = 50,
    Map<String, int>? stockAllocation,
    this.mockCashIncome = 0.0,
    this.mockUpiIncome = 0.0,
    List<DriverExpense>? mockExpenses,
  })  : stockAllocation = stockAllocation ?? {},
        mockExpenses = mockExpenses ?? [];
}

class WarehouseItem {
  final String weight;
  final String title;
  int filledStock;
  int emptyStock;
  final double price;

  WarehouseItem({
    required this.weight,
    required this.title,
    required this.filledStock,
    required this.emptyStock,
    required this.price,
  });
}

class DepotVehicle {
  final String plateNumber;
  String model;
  String assignedDriverName;
  String assignedDriverId;
  String route;
  String status;
  Map<String, int>? _stock;
  Map<String, int>? _emptyStock;

  DepotVehicle({
    required this.plateNumber,
    this.model = 'Tata 407 Delivery Truck',
    required this.assignedDriverName,
    required this.assignedDriverId,
    required this.route,
    this.status = 'Ready in Depot',
    Map<String, int>? stock,
    Map<String, int>? emptyStock,
  })  : _stock = stock,
        _emptyStock = emptyStock;

  Map<String, int> get stock {
    _stock ??= {};
    return _stock!;
  }

  set stock(Map<String, int> val) {
    _stock = val;
  }

  Map<String, int> get emptyStock {
    _emptyStock ??= {};
    return _emptyStock!;
  }

  set emptyStock(Map<String, int> val) {
    _emptyStock = val;
  }

  int get totalCylinders => stock.values.fold(0, (sum, q) => sum + q);
  int get totalEmpties => emptyStock.values.fold(0, (sum, q) => sum + q);
}

class AppState extends ChangeNotifier {
  /// Strictly purge any legacy local cache keys from SharedPreferences.
  /// All business data is fetched live from backend DB.
  Future<void> _cleanStaleCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('cached_vehicle_number');
      await prefs.remove('cached_route_info');
      await prefs.remove('cached_driver_name');
      await prefs.remove('cached_full_name');
      await prefs.remove('cached_allocation_id');
      await prefs.remove('cached_cylinders_json');
    } catch (_) {}
  }

  // Theme info
  bool isDarkMode = false;

  void toggleTheme() {
    isDarkMode = !isDarkMode;
    notifyListeners();
  }

  // Driver info
  String driverName = '';
  String fullName = '';
  String loggedInUsername = '';
  String driverId = '';
  int? currentDriverDbId;
  int? currentAllocationId;
  int? currentDeliveryNoteId;
  int? currentRouteId;
  String vehicleNumber = '';
  String routeInfo = '';
  String endShiftStatus = 'ACTIVE';
  bool get isShiftLocked =>
      endShiftStatus.toUpperCase() == 'PENDING' ||
      endShiftStatus.toUpperCase() == 'PENDING_APPROVAL' ||
      endShiftStatus.toUpperCase() == 'SETTLED' ||
      endShiftStatus.toUpperCase() == 'APPROVED';
  bool get isPendingApproval =>
      endShiftStatus.toUpperCase() == 'PENDING' ||
      endShiftStatus.toUpperCase() == 'PENDING_APPROVAL';
  bool get isSettledShift =>
      endShiftStatus.toUpperCase() == 'SETTLED' ||
      endShiftStatus.toUpperCase() == 'APPROVED';
  bool isLoadingFromBackend = false;
  DateTime? lastSyncTime;

  // Depot Vehicle Fleet - Strictly dynamic from backend DB
  List<DepotVehicle> vehicles = [];

  // Depot Vehicle Fleet available for allocation
  final List<String> availableVehicles = [];

  // Stock for Allocated Vehicle - Populated from backend DB
  late List<CylinderType> cylinders = [];

  int get totalStartingFilled => cylinders.fold(0, (sum, c) => sum + c.initialFilledStock);
  int get totalStartingEmpty => 0;

  // Other Items allocated to vehicle (Stoves, Burners, Lighters, etc.)
  List<OtherProductItem> otherProducts = [];

  int get totalOtherStock => otherProducts.fold(0, (sum, i) => sum + i.initialStock);
  int get totalOtherDelivered => otherProducts.fold(0, (sum, i) => sum + i.deliveredStock);
  int get totalOtherBalance => otherProducts.fold(0, (sum, i) => sum + i.balanceStock);

  int get totalDeliveredFilled => cylinders.fold(0, (sum, c) => sum + c.deliveredStock);
  int get totalDeliveredEmpty => orders.fold(0, (sum, o) => sum + o.totalEmpties);
  int get totalClosingFilled => cylinders.fold(0, (sum, c) => sum + c.filledStock);
  int get totalClosingEmpty => cylinders.fold(0, (sum, c) => sum + c.emptyStock);

  // Customers - Populated strictly from backend DB Sundry Debtors
  final List<Customer> customers = [
    Customer(
      ledgerId: 55,
      name: 'AJIL',
      phone: '08078923590',
      address: 'Cheruvathoor House, Pengamuck PO, Thrissur',
      outstanding: -1200.0,
    ),
    Customer(
      ledgerId: 53,
      name: 'Green City Traders',
      phone: '9847199999',
      address: '',
      outstanding: -40554.0,
    ),
    Customer(
      ledgerId: 51,
      name: 'Kochi Supermarkets',
      phone: '9847012345',
      address: '',
      outstanding: 40000.0,
    ),
  ];

  // Orders
  final List<DeliveryOrder> orders = [];
  int _orderCounter = 0;
  int _stopCounter = 0;

  // Current delivery state
  Customer? selectedCustomer;
  late List<DeliveryItem> deliveryItems;
  Map<String, int> otherDeliveryQty = {};
  String paymentMethod = 'Cash';
  double collectedAmount = 0;
  double splitCashAmount = 0;
  double splitUpiAmount = 0;

  AppState() {
    _initDeliveryItems();
    _cleanStaleCache();
  }

  void _initDeliveryItems({bool forceReset = false}) {
    final existingQuantities = <String, Map<String, int>>{};
    if (!forceReset) {
      try {
        for (final item in deliveryItems) {
          existingQuantities[item.cylinder.weight] = {
            'deliveryQty': item.deliveryQty,
            'emptyReturnQty': item.emptyReturnQty,
          };
        }
      } catch (_) {}
    }

    deliveryItems = cylinders.map((c) {
      final existing = existingQuantities[c.weight];
      if (existing != null && !forceReset) {
        final dQty = existing['deliveryQty'] ?? 0;
        final eQty = existing['emptyReturnQty'] ?? 0;
        return DeliveryItem(
          cylinder: c,
          deliveryQty: dQty.clamp(0, c.filledStock),
          emptyReturnQty: eQty,
        );
      }
      return DeliveryItem(cylinder: c);
    }).toList();
  }

  /// Fetch Sundry Debtors from backend DB and populate customers list
  Future<void> fetchCustomers([int? filterRouteId]) async {
    try {
      final targetRouteId = filterRouteId ?? currentRouteId;
      final backendCustomers = await ApiService.getCustomers(targetRouteId);
      if (backendCustomers.isNotEmpty) {
        customers.clear();
        for (final c in backendCustomers) {
          final balance = safeDouble(c['CurrentBalance']);
          final phone = (c['Phone'] ?? c['MobileNumber'] ?? c['PhoneNumber'] ?? '').toString().trim();
          final addr = (c['AddressLine1'] ?? c['Address'] ?? '').toString().trim();
          final rId = safeIntNullable(c['RouteId'] ?? c['Route'] ?? c['route_id']);
          final rNm = (c['RouteName'] ?? c['route_name'] ?? '').toString().trim();
          customers.add(Customer(
            ledgerId: safeIntNullable(c['LedgerId']),
            name: (c['LedgerName'] ?? '').toString().trim(),
            phone: phone,
            address: addr,
            outstanding: balance,
            creditLimit: safeDouble(c['CreditLimit']),
            creditPeriodDays: safeInt(c['CreditPeriodDays']),
            emptyStockLimit: safeDouble(c['EmptyStockLimit']),
            routeId: rId,
            routeName: rNm.isNotEmpty ? rNm : null,
          ));
        }
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Error fetching customers: $e');
    }
  }

  Future<void> clearLocalCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('cached_vehicle_number');
      await prefs.remove('cached_route_info');
      await prefs.remove('cached_driver_name');
      await prefs.remove('cached_allocation_id');
      await prefs.remove('auth_token');
      await prefs.remove('auth_user');
      await prefs.clear();
    } catch (_) {}

    vehicleNumber = '';
    routeInfo = '';
    driverName = '';
    fullName = '';
    driverId = '';
    currentDriverDbId = null;
    currentAllocationId = null;
    currentRouteId = null;
    cylinders = [];
    otherProducts = [];
    orders.clear();
    expenses.clear();
    customers.clear();
    vehicles.clear();
    fleetDrivers.clear();
    warehouseItems.clear();
    _initDeliveryItems();
    notifyListeners();
  }

  Future<void> syncFromBackend({int? driverIdParam}) async {
    isLoadingFromBackend = true;
    notifyListeners();

    try {
      final user = await ApiService.getSavedUser();
      final role = user?['role']?.toString().toLowerCase() ?? '';
      final isAdmin = role.contains('admin') || role.contains('manager');
      final dId = driverIdParam ?? (user != null ? safeIntNullable(user['driver_id'] ?? user['DriverId']) : null);

      if (user != null) {
        final uname = user['username']?.toString().trim();
        if (uname != null && uname.isNotEmpty) {
          loggedInUsername = uname;
          fullName = uname;
        }
      }

      // If Admin or Manager, hydrate depot & fleet analytics authoritative from backend
      if (isAdmin || dId == null) {
        await fetchAdminData();
      }

      if (dId != null && dId > 0) {
        currentDriverDbId = dId;
        driverId = 'DRV$dId';
      }

      final alloc = await ApiService.getDriverAllocation(dId);
      if (alloc != null) {
        currentAllocationId = safeIntNullable(alloc['RouteVehicleDriverId'] ?? alloc['id']);
        currentRouteId = safeIntNullable(alloc['RouteId'] ?? alloc['Route'] ?? alloc['route_id']);

        final vNum = alloc['VehicleNumber'] ?? alloc['vehicle_number'] ?? alloc['Vehicle_number'];
        if (vNum != null && vNum.toString().trim().isNotEmpty) {
          vehicleNumber = vNum.toString().trim();
        }

        final rName = alloc['RouteName'] ?? alloc['route_name'] ?? alloc['Route_name'];
        if (rName != null && rName.toString().trim().isNotEmpty) {
          routeInfo = rName.toString().trim();
        }

        final dName = alloc['DriverName'] ?? alloc['driver_name'];
        if (dName != null && dName.toString().trim().isNotEmpty) {
          driverName = dName.toString().trim();
        }

        if (currentAllocationId != null) {
          // 1. Authoritative Shift Status Check from backend
          try {
            final statusData = await ApiService.getShiftStatus(currentAllocationId!);
            if (statusData != null) {
              final newStatus = (statusData['status'] ?? 'ACTIVE').toString();
              final newDnId = safeIntNullable(statusData['delivery_note_id'] ?? statusData['settlement_id']);

              // If a new delivery note / shift was allocated, wipe previous shift's orders, expenses, and collections!
              if (currentDeliveryNoteId != null && newDnId != null && newDnId != currentDeliveryNoteId) {
                orders.clear();
                expenses.clear();
                collectedAmount = 0.0;
              }
              currentDeliveryNoteId = newDnId;
              endShiftStatus = newStatus;
            }
          } catch (_) {}

          if (isSettledShift) {
            // Shift is settled & approved: wipe all live sales, expenses, and zero all inventory on driver's device awaiting next allocation
            orders.clear();
            expenses.clear();
            collectedAmount = 0.0;
            for (final c in cylinders) {
              c.filledStock = 0;
              c.emptyStock = 0;
              c.initialFilledStock = 0;
            }
            for (final p in otherProducts) {
              p.balanceStock = 0;
              p.deliveredStock = 0;
              p.initialStock = 0;
            }
          } else {
            // Shift is ACTIVE or PENDING approval: load and retain live van stock, sales orders, and trip expenses
            final vanStock = await ApiService.getVanStock(currentAllocationId!);
            if (vanStock.isNotEmpty) {
              // Separate Cylinders from Other Items (stoves, burners, lighters, etc.)
              final cylItems = vanStock.where((s) {
                if (s['IsCylinder'] == true) return true;
                if (s['IsOther'] == true) return false;
                final name = (s['ProductName'] ?? '').toString().toLowerCase();
                return name.contains('cylinder') || name.contains('kg') || name.contains('lpg');
              }).toList();

              final otherItems = vanStock.where((s) {
                if (s['IsOther'] == true) return true;
                if (s['IsCylinder'] == true) return false;
                final name = (s['ProductName'] ?? '').toString().toLowerCase();
                return !name.contains('cylinder') && !name.contains('kg') && !name.contains('lpg');
              }).toList();

              // Load cylinders strictly from backend DB van-stock with live allocated, delivered, balance, empty
              cylinders = cylItems.map((s) => CylinderType(
                productId: safeInt(s['ProductId']),
                weight: (s['AppProductName'] != null && s['AppProductName'].toString().trim().isNotEmpty)
                    ? s['AppProductName'].toString().trim()
                    : (s['ProductName'] ?? '').toString(),
                price: safeDouble(s['SalesPrice']),
                gstPercentage: safeDouble(s['GSTPercentage']),
                hsnCode: s['HSNCode']?.toString() ?? '271109',
                initialFilledStock: safeInt(s['AllocatedQty'] ?? s['OnboardQty']),
                filledStock: safeInt(s['BalanceQty'] ?? s['OnboardQty']),
                emptyStock: safeInt(s['EmptyQty']),
              )).toList();
              _initDeliveryItems();

              // Load Other Products allocated to this vehicle
              otherProducts = otherItems
                  .where((s) => safeInt(s['AllocatedQty'] ?? s['OnboardQty']) > 0)
                  .map((s) => OtherProductItem(
                    productId: safeInt(s['ProductId']),
                    name: (s['AppProductName'] != null && s['AppProductName'].toString().trim().isNotEmpty)
                        ? s['AppProductName'].toString().trim()
                        : (s['ProductName'] ?? '').toString(),
                    price: safeDouble(s['SalesPrice']),
                    gstPercentage: safeDouble(s['GSTPercentage']),
                    categoryName: (s['CategoryName'] ?? 'Other Items').toString(),
                    initialStock: safeInt(s['AllocatedQty'] ?? s['OnboardQty']),
                    deliveredStock: safeInt(s['DeliveredQty']),
                    balanceStock: safeInt(s['BalanceQty'] ?? s['OnboardQty']),
                  ))
                  .toList();
            }

            // Fetch Driver's Sales for Today from Backend
            try {
              final backendSales = await ApiService.getDriverSales(currentAllocationId!);
              final newOrders = <DeliveryOrder>[];
              for (final s in backendSales) {
                final cData = s['customer'] as Map<String, dynamic>? ?? {};
                final itemsList = (s['items'] as List? ?? []).map((it) {
                  var w = it['weight']?.toString().trim() ?? '';
                  final kgMatch = RegExp(r'(\d+(?:\.\d+)?\s*KG)', caseSensitive: false).firstMatch(w);
                  if (kgMatch != null) {
                    w = kgMatch.group(1)!.replaceAll(' ', '').toUpperCase();
                  }
                  final matchedCyl = cylinders.firstWhere(
                    (c) => c.weight.trim().toUpperCase() == w.toUpperCase() ||
                           (w.isNotEmpty && c.weight.toUpperCase().contains(w.toUpperCase())),
                    orElse: () => CylinderType(
                      productId: safeInt(it['productId']),
                      weight: w,
                      price: safeDouble(it['rate']),
                      filledStock: 0,
                    ),
                  );
                  return DeliveryItem(
                    cylinder: matchedCyl,
                    deliveryQty: safeInt(it['deliveryQty']),
                    emptyReturnQty: safeInt(it['emptyReturnQty']),
                  );
                }).toList();

                final cLedgerId = safeIntNullable(cData['ledgerId']);
                final cName = cData['name'] ?? 'Customer';
                final cPhoneRaw = (cData['phone'] ?? '').toString().trim();

                Customer matchedCust;
                try {
                  matchedCust = customers.firstWhere(
                    (c) => (cLedgerId != null && c.ledgerId == cLedgerId) ||
                           (c.name.trim().toLowerCase() == cName.toString().trim().toLowerCase()),
                  );
                } catch (_) {
                  matchedCust = Customer(
                    ledgerId: cLedgerId,
                    name: cName,
                    phone: cPhoneRaw,
                  );
                }
                final resolvedPhone = cPhoneRaw.isNotEmpty ? cPhoneRaw : matchedCust.phone;

                final paidAmt = safeDouble(s['paidAmount']);
                final billAmt = safeDouble(s['grandTotal'] != null && safeDouble(s['grandTotal']) > 0 ? s['grandTotal'] : s['amount']);
                final isCreditSale = (s['paymentMethod'] ?? '').toString().toUpperCase() == 'CREDIT';

                newOrders.add(DeliveryOrder(
                  ticketId: s['ticketId'] != null
                      ? s['ticketId'].toString().replaceAll(RegExp(r'^(DT|BT)-'), 'INV-')
                      : 'INV-ORD',
                  salesId: safeIntNullable(s['salesId']),
                  customer: Customer(
                    ledgerId: cLedgerId,
                    name: cName,
                    phone: resolvedPhone,
                    address: matchedCust.address,
                    type: matchedCust.type,
                  ),
                  items: itemsList,
                  totalCylinders: safeInt(s['totalCylinders']),
                  totalEmpties: safeInt(s['totalEmpties']),
                  amount: isCreditSale ? 0.0 : paidAmt,
                  billTotal: billAmt > 0 ? billAmt : (paidAmt > 0 ? paidAmt : null),
                  paymentMethod: s['paymentMethod'] ?? 'Cash',
                  cashAmount: s['cashAmount'] != null ? safeDouble(s['cashAmount']) : null,
                  upiAmount: s['upiAmount'] != null ? safeDouble(s['upiAmount']) : null,
                  time: s['time'] ?? '10:00 AM',
                  status: s['status'] ?? 'Delivered',
                ));
              }

              // Preserve any locally recorded order that backend hasn't synced yet
              final backendTicketIds = newOrders.map((o) => o.ticketId.trim().toUpperCase()).toSet();
              final backendSalesIds = newOrders.where((o) => o.salesId != null).map((o) => o.salesId).toSet();
              final localOnly = orders.where((o) {
                final tIdMatch = backendTicketIds.contains(o.ticketId.trim().toUpperCase());
                final sIdMatch = o.salesId != null && backendSalesIds.contains(o.salesId);
                return !tIdMatch && !sIdMatch;
              }).toList();

              orders.clear();
              orders.addAll(newOrders);

              for (final loc in localOnly.reversed) {
                orders.insert(0, loc);
              }
              notifyListeners();
            } catch (e) {
              debugPrint('Failed to load driver sales: $e');
            }

            // Fetch Driver's Expenses for Today from Backend
            try {
              final backendExpenses = await ApiService.getDriverExpenses(currentAllocationId!);
              expenses.clear(); // Always clear previous list before populating
              for (final exp in backendExpenses) {
                expenses.add(DriverExpense(
                  id: (exp['id'] ?? exp['expense_id'] ?? '').toString(),
                  title: (exp['category'] ?? exp['title'] ?? 'Expense').toString(),
                  amount: safeDouble(exp['amount']),
                  paymentMethod: (exp['payment_mode'] ?? exp['paymentMethod'] ?? 'Cash').toString(),
                  time: (exp['time'] ?? '').toString(),
                ));
              }
            } catch (e) {
              debugPrint('Failed to load driver expenses: $e');
            }
          }
        }
      } else if (currentAllocationId == null) {
        // Driver has no active vehicle allocation on initial login
        currentAllocationId = null;
        currentRouteId = null;
        vehicleNumber = '';
        routeInfo = '';
        orders.clear();
        expenses.clear();
        cylinders.clear();
        otherProducts.clear();
        _initDeliveryItems();
      }

      // Customers from Backend (Sundry Debtors)
      await fetchCustomers();

      // If cylinders empty, fetch products from catalog (strictly cylinders only)
      if (cylinders.isEmpty) {
        final products = await ApiService.getProducts();
        final cylCatalog = products.where((p) {
          final isCyl = p['IsCylinder'] == true;
          final name = (p['ProductName'] ?? '').toString().toLowerCase();
          return isCyl || name.contains('cylinder') || name.contains('kg') || name.contains('lpg');
        }).toList();

        if (cylCatalog.isNotEmpty) {
          cylinders = cylCatalog.map((p) => CylinderType(
            productId: safeInt(p['ProductId']),
            weight: (p['AppProductName'] != null && p['AppProductName'].toString().trim().isNotEmpty)
                ? p['AppProductName'].toString().trim()
                : (p['ProductName'] ?? ''),
            price: safeDouble(p['SalesPrice']),
            gstPercentage: safeDouble(p['GSTPercentage']),
            hsnCode: p['HSNCode']?.toString() ?? '271109',
            filledStock: 0,
            emptyStock: 0,
          )).toList();
          _initDeliveryItems();
        }
      }
    } catch (e) {
      debugPrint('Error syncing from backend: $e');
    } finally {
      isLoadingFromBackend = false;
      lastSyncTime = DateTime.now();
      notifyListeners();
    }
  }

  void selectCustomer(Customer? customer) {
    selectedCustomer = customer;
    notifyListeners();
  }

  void updateDeliveryQty(int index, int qty) {
    if (qty >= 0 && qty <= deliveryItems[index].cylinder.filledStock) {
      deliveryItems[index].deliveryQty = qty;
      notifyListeners();
    }
  }

  void updateEmptyReturnQty(int index, int qty) {
    if (qty >= 0) {
      deliveryItems[index].emptyReturnQty = qty;
      notifyListeners();
    }
  }

  void setPaymentMethod(String method) {
    paymentMethod = method;
    notifyListeners();
  }

  void setSplitAmounts(double cash, double upi) {
    splitCashAmount = cash;
    splitUpiAmount = upi;
    notifyListeners();
  }

  void setCollectedAmount(double amount) {
    collectedAmount = amount;
    notifyListeners();
  }

  int getOtherDeliveryQty(String name) => otherDeliveryQty[name] ?? 0;

  void updateOtherDeliveryQty(String name, int qty) {
    otherDeliveryQty[name] = qty.clamp(0, 999);
    notifyListeners();
  }

  int get totalOtherDeliveryCount =>
      otherDeliveryQty.values.fold(0, (sum, q) => sum + q);

  int get totalCylinders {
    return deliveryItems.fold(0, (sum, item) => sum + item.deliveryQty);
  }

  int get totalEmpties {
    return deliveryItems.fold(0, (sum, item) => sum + item.emptyReturnQty);
  }

  double get totalBillAmount {
    return collectedAmount;
  }

  int get truckStock {
    return cylinders.fold(0, (sum, c) => sum + c.filledStock);
  }

  int get totalEmptyStock {
    return cylinders.fold(0, (sum, c) => sum + c.emptyStock);
  }

  double get todayCollectedTotal {
    return orders.fold(0.0, (sum, o) => sum + o.amount);
  }

  int get todayDeliveredCount {
    return orders.fold(0, (sum, o) => sum + o.totalCylinders);
  }

  bool get canSubmitDelivery {
    final isEmptiesOnly = totalCylinders == 0 && totalOtherDeliveryCount == 0 && totalEmpties > 0;
    final isMoneyOnly = totalCylinders == 0 && totalOtherDeliveryCount == 0 && totalEmpties == 0 && collectedAmount > 0;
    return selectedCustomer != null &&
        (totalCylinders > 0 || totalOtherDeliveryCount > 0 || totalEmpties > 0 || isMoneyOnly) &&
        (paymentMethod.isNotEmpty || (isEmptiesOnly && collectedAmount <= 0));
  }

  String _generateTicketId() {
    final now = DateTime.now();
    final randomSuffix = (10000 + (now.microsecondsSinceEpoch % 90000)).toString();
    final isEmptiesOnly = totalCylinders == 0 && totalOtherDeliveryCount == 0 && totalEmpties > 0;
    final isMoneyOnly = totalCylinders == 0 && totalOtherDeliveryCount == 0 && totalEmpties == 0 && collectedAmount > 0;
    if (isEmptiesOnly) {
      if (collectedAmount <= 0) {
        return 'EMTRTN-$randomSuffix';
      } else {
        return 'RCPT-$randomSuffix';
      }
    }
    if (isMoneyOnly) {
      return 'RCPT-$randomSuffix';
    }
    return 'INV-$randomSuffix';
  }

  Future<bool> completeDelivery() async {
    if (!canSubmitDelivery) return false;

    final isEmptiesOnly = totalCylinders == 0 && totalOtherDeliveryCount == 0 && totalEmpties > 0;
    if (isEmptiesOnly && collectedAmount <= 0) {
      paymentMethod = 'N/A';
    }

    _stopCounter++;
    final now = TimeOfDay.now();
    final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
    final period = now.period == DayPeriod.am ? 'AM' : 'PM';
    final timeStr =
        '${hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} $period';

    final activeItems = deliveryItems
        .where((i) => i.deliveryQty > 0 || i.emptyReturnQty > 0)
        .toList();

    final ticketId = _generateTicketId();

    final isSplit = paymentMethod.toLowerCase() == 'split';
    final effCash = isSplit ? splitCashAmount : (paymentMethod.toLowerCase() == 'cash' ? collectedAmount : 0.0);
    final effUpi = isSplit ? splitUpiAmount : (paymentMethod.toLowerCase().contains('upi') ? collectedAmount : 0.0);

    double calculatedBill = 0.0;
    for (final it in activeItems) {
      calculatedBill += it.deliveryQty * it.cylinder.price;
    }
    for (final entry in otherDeliveryQty.entries) {
      if (entry.value > 0) {
        final prod = otherProducts.firstWhere(
          (p) => p.name == entry.key,
          orElse: () => OtherProductItem(name: entry.key, price: 0, initialStock: 0),
        );
        calculatedBill += entry.value * prod.price;
      }
    }
    final orderBillTotal = calculatedBill > 0 ? calculatedBill : collectedAmount;

    final newOrder = DeliveryOrder(
      ticketId: ticketId,
      customer: selectedCustomer!,
      items: activeItems
          .map((i) => DeliveryItem(
                cylinder: i.cylinder,
                deliveryQty: i.deliveryQty,
                emptyReturnQty: i.emptyReturnQty,
              ))
          .toList(),
      totalCylinders: totalCylinders,
      totalEmpties: totalEmpties,
      amount: collectedAmount,
      billTotal: orderBillTotal,
      paymentMethod: paymentMethod,
      cashAmount: effCash,
      upiAmount: effUpi,
      time: timeStr,
      stopNumber: _stopCounter,
    );
    orders.insert(0, newOrder);

    // Immediately update customer outstanding balance locally
    final isCredit = paymentMethod.toLowerCase() == 'credit';
    final isPureReceipt = (totalCylinders == 0 && totalOtherDeliveryCount == 0 && totalEmpties == 0 && collectedAmount > 0);
    if (selectedCustomer != null) {
      if (isCredit) {
        selectedCustomer!.outstanding += orderBillTotal;
      } else if (isPureReceipt) {
        selectedCustomer!.outstanding -= collectedAmount;
      }
      try {
        final custInList = customers.firstWhere((c) =>
          (selectedCustomer?.ledgerId != null && c.ledgerId == selectedCustomer!.ledgerId) ||
          (c.name.toLowerCase() == selectedCustomer!.name.toLowerCase())
        );
        if (isCredit) {
          custInList.outstanding += orderBillTotal;
        } else if (isPureReceipt) {
          custInList.outstanding -= collectedAmount;
        }
      } catch (_) {}
    }

    // Update stock locally
    for (final item in deliveryItems) {
      if (item.deliveryQty > 0) {
        item.cylinder.filledStock -= item.deliveryQty;
      }
      if (item.emptyReturnQty > 0) {
        item.cylinder.emptyStock += item.emptyReturnQty;
      }
    }

    for (final entry in otherDeliveryQty.entries) {
      if (entry.value > 0) {
        final prod = otherProducts.firstWhere(
          (p) => p.name == entry.key,
          orElse: () => OtherProductItem(name: entry.key, price: 0, initialStock: 0),
        );
        prod.deliveredStock += entry.value;
        prod.balanceStock = (prod.initialStock - prod.deliveredStock).clamp(0, 9999);
      }
    }

    lastSyncTime = DateTime.now();
    notifyListeners();

    // Live sync to backend database
    if (currentAllocationId != null && currentAllocationId! > 0) {
      final backendItems = activeItems.map((it) => {
        'product_id': it.cylinder.productId,
        'weight': it.cylinder.weight,
        'qty': it.deliveryQty,
        'empty_qty': it.emptyReturnQty,
        'rate': it.cylinder.price,
        'gst_pct': it.cylinder.gstPercentage,
      }).toList();

      final backendOtherItems = otherDeliveryQty.entries
          .where((e) => e.value > 0)
          .map((e) {
            final prod = otherProducts.firstWhere(
              (p) => p.name == e.key,
              orElse: () => OtherProductItem(name: e.key, price: 0, initialStock: 0),
            );
            return {
              'product_id': prod.productId,
              'weight': prod.name,
              'qty': e.value,
              'empty_qty': 0,
              'rate': prod.price,
              'gst_pct': prod.gstPercentage,
            };
          })
          .toList();

      final allBackendItems = [...backendItems, ...backendOtherItems];

      try {
        final res = await ApiService.createSale(
          allocationId: currentAllocationId!,
          customerLedgerId: selectedCustomer?.ledgerId ?? 0,
          items: allBackendItems,
          paymentMethod: paymentMethod,
          amountCollected: collectedAmount,
          cashAmount: effCash,
          upiAmount: effUpi,
          ticketId: ticketId,
        );
        if (res['success'] == true) {
          final returnedTicket = res['ticket_id']?.toString();
          if (returnedTicket != null && returnedTicket.isNotEmpty) {
            newOrder.ticketId = returnedTicket;
          }
          final sid = res['sales_id'];
          if (sid is int) {
            newOrder.salesId = sid;
          } else if (sid != null) {
            newOrder.salesId = int.tryParse(sid.toString());
          }
          lastSyncTime = DateTime.now();
          notifyListeners();
          fetchCustomers();
        }
      } catch (e) {
        debugPrint('Live backend sale sync error: $e');
      }
    }

    return true;
  }

  Future<DeliveryOrder?> recordPackageDelivery({
    required Customer customer,
    required Map<String, dynamic> package,
    required String paymentMode,
    required double totalAmount,
    double? cashAmount,
    double? upiAmount,
  }) async {
    final ticketId = 'PK-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}';
    final now = DateTime.now();
    final timeStr = "${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}";

    final allBackendItems = <Map<String, dynamic>>[];

    // 1. Cylinder item
    final cylinderProductId = package['CylinderProduct'];
    final cylinderQty = safeInt(package['CylinderQty'], 1);
    final cylinderRate = safeDouble(package['CylinderRate'], 0.0);
    final cylinderName = (package['cylinder_name'] ?? 'LPG Cylinder').toString();

    // Verify that van contains every package product in sufficient quantity before proceeding
    if (cylinderProductId != null && cylinderQty > 0) {
      final matchingCyl = deliveryItems.firstWhere(
        (it) => it.cylinder.productId == cylinderProductId,
        orElse: () => DeliveryItem(cylinder: CylinderType(weight: '', filledStock: 0, emptyStock: 0, price: 0)),
      );
      if (matchingCyl.cylinder.filledStock < cylinderQty) {
        throw Exception('Insufficient van stock for $cylinderName! Required: $cylinderQty, Available: ${matchingCyl.cylinder.filledStock}');
      }
    }

    final items = package['items'] as List<dynamic>? ?? [];
    for (final it in items) {
      final pid = it['Product'] ?? it['product_id'];
      final pName = (it['ProductName'] ?? it['product_name'] ?? 'Accessory').toString();
      final q = safeInt(it['Quantity'], 1);
      if (q <= 0) continue;
      final availProd = otherProducts.firstWhere(
        (p) => p.productId == pid || p.name.toLowerCase() == pName.toLowerCase(),
        orElse: () => OtherProductItem(name: pName, price: 0, initialStock: 0, balanceStock: 0),
      );
      if (availProd.balanceStock < q) {
        throw Exception('Insufficient van stock for $pName! Required: $q, Available: ${availProd.balanceStock}');
      }
    }

    if (cylinderProductId != null) {
      allBackendItems.add({
        'product_id': cylinderProductId,
        'weight': cylinderName,
        'qty': cylinderQty,
        'empty_qty': 0,
        'rate': cylinderRate,
        'gst_pct': 5,
      });

      // Deduct from local van stock if matching cylinder found
      for (final it in deliveryItems) {
        if (it.cylinder.productId == cylinderProductId) {
          it.cylinder.filledStock = (it.cylinder.filledStock - cylinderQty).clamp(0, 9999);
        }
      }
    }

    // 2. Accessories items
    for (final it in items) {
      final pid = it['Product'] ?? it['product_id'];
      final pName = (it['ProductName'] ?? it['product_name'] ?? 'Accessory').toString();
      final q = safeInt(it['Quantity'], 1);
      final r = safeDouble(it['Rate'], 0.0);

      allBackendItems.add({
        'product_id': pid,
        'weight': pName,
        'qty': q,
        'empty_qty': 0,
        'rate': r,
        'gst_pct': 18,
      });

      // Deduct from local accessories stock
      final prod = otherProducts.firstWhere(
        (p) => p.productId == pid || p.name.toLowerCase() == pName.toLowerCase(),
        orElse: () => OtherProductItem(name: pName, price: r, initialStock: 0),
      );
      prod.deliveredStock += q;
      prod.balanceStock = (prod.initialStock - prod.deliveredStock).clamp(0, 9999);
    }

    // 3. Labor / Installation charge if any
    final laborCharge = safeDouble(package['LaborCharge'], 0.0);
    if (laborCharge > 0) {
      allBackendItems.add({
        'product_id': null,
        'weight': package['LaborDescription'] ?? 'Installation & Fitting',
        'qty': 1,
        'empty_qty': 0,
        'rate': laborCharge,
        'gst_pct': 18,
      });
    }

    final isSplit = paymentMode.toLowerCase() == 'split';
    final effCash = isSplit ? (cashAmount ?? 0.0) : (paymentMode.toLowerCase() == 'cash' ? totalAmount : 0.0);
    final effUpi = isSplit ? (upiAmount ?? 0.0) : (paymentMode.toLowerCase().contains('upi') ? totalAmount : 0.0);

    final newOrder = DeliveryOrder(
      ticketId: ticketId,
      customer: customer,
      items: [
        DeliveryItem(
          cylinder: CylinderType(
            weight: '$cylinderName (${package['PackageName']})',
            filledStock: 0,
            emptyStock: 0,
            price: totalAmount,
          ),
          deliveryQty: 1,
          emptyReturnQty: 0,
        )
      ],
      totalCylinders: cylinderQty,
      totalEmpties: 0,
      amount: totalAmount,
      paymentMethod: paymentMode,
      cashAmount: effCash,
      upiAmount: effUpi,
      time: timeStr,
      stopNumber: ++_stopCounter,
    );
    orders.insert(0, newOrder);
    lastSyncTime = DateTime.now();
    notifyListeners();

    if (currentAllocationId != null && currentAllocationId! > 0) {
      try {
        final res = await ApiService.createSale(
          allocationId: currentAllocationId!,
          customerLedgerId: customer.ledgerId ?? 0,
          items: allBackendItems,
          paymentMethod: paymentMode,
          amountCollected: totalAmount,
          cashAmount: effCash,
          upiAmount: effUpi,
          ticketId: ticketId,
        );
        if (res['success'] == true) {
          final returnedTicket = res['ticket_id']?.toString();
          if (returnedTicket != null && returnedTicket.isNotEmpty) {
            newOrder.ticketId = returnedTicket;
          }
          final sid = res['sales_id'];
          if (sid is int) {
            newOrder.salesId = sid;
          } else if (sid != null) {
            newOrder.salesId = int.tryParse(sid.toString());
          }
          notifyListeners();
          fetchCustomers();
          syncFromBackend();
        }
      } catch (e) {
        debugPrint('Package sale sync error: $e');
      }
    }

    return newOrder;
  }

  Future<void> deleteOrder(DeliveryOrder order) async {
    // Restore cylinder stock locally
    for (final item in order.items) {
      final cylinder = cylinders.firstWhere(
        (c) => c.weight == item.cylinder.weight,
        orElse: () => item.cylinder,
      );
      if (item.deliveryQty > 0) {
        cylinder.filledStock += item.deliveryQty;
      }
      if (item.emptyReturnQty > 0) {
        cylinder.emptyStock = (cylinder.emptyStock - item.emptyReturnQty).clamp(0, 9999);
      }
    }
    orders.removeWhere((o) => o.ticketId == order.ticketId);
    lastSyncTime = DateTime.now();
    notifyListeners();

    // Synchronize deletion to backend to reverse StockMovement and cancel Sales record
    try {
      await ApiService.cancelSaleByTicket(order.ticketId, salesId: order.salesId);
      // Immediately refresh from backend to ensure 100% authoritative stock, customers, and sales sync
      fetchCustomers();
      await syncFromBackend();
    } catch (e) {
      debugPrint('Live backend order cancel error: $e');
    }
  }

  Future<void> cancelOrder(DeliveryOrder order) => deleteOrder(order);

  /// Update an existing order's typed bill amount and payment method
  /// Update an existing order's items (cylinders & empties), amount, and payment method
  Future<bool> updateOrderWithItems({
    required String ticketId,
    required double newAmount,
    required String newPaymentMethod,
    required List<DeliveryItem> updatedItems,
    double? cashAmount,
    double? upiAmount,
  }) async {
    final index = orders.indexWhere((o) => o.ticketId == ticketId);
    if (index == -1) return false;

    final oldOrder = orders[index];

    // 1. Revert previous cylinder stock impact locally
    for (final it in oldOrder.items) {
      final cyl = cylinders.firstWhere(
        (c) => c.productId == it.cylinder.productId || c.weight == it.cylinder.weight,
        orElse: () => it.cylinder,
      );
      cyl.filledStock += it.deliveryQty;
      cyl.emptyStock = (cyl.emptyStock - it.emptyReturnQty).clamp(0, 9999);
    }

    // 2. Apply new cylinder stock impact locally
    for (final it in updatedItems) {
      final cyl = cylinders.firstWhere(
        (c) => c.productId == it.cylinder.productId || c.weight == it.cylinder.weight,
        orElse: () => it.cylinder,
      );
      cyl.filledStock = (cyl.filledStock - it.deliveryQty).clamp(0, 9999);
      cyl.emptyStock += it.emptyReturnQty;
    }

    final totalDeliv = updatedItems.fold<int>(0, (sum, it) => sum + it.deliveryQty);
    final totalEmpty = updatedItems.fold<int>(0, (sum, it) => sum + it.emptyReturnQty);

    double? finalCashAmt = cashAmount;
    double? finalUpiAmt = upiAmount;
    final pmLower = newPaymentMethod.toLowerCase();
    if (pmLower == 'cash') {
      finalCashAmt = newAmount;
      finalUpiAmt = 0.0;
    } else if (pmLower.contains('upi') || pmLower.contains('bank') || pmLower.contains('online')) {
      finalCashAmt = 0.0;
      finalUpiAmt = newAmount;
    } else if (pmLower == 'credit') {
      finalCashAmt = 0.0;
      finalUpiAmt = 0.0;
    } else if (pmLower == 'split') {
      finalCashAmt = cashAmount ?? (newAmount / 2);
      finalUpiAmt = upiAmount ?? (newAmount - finalCashAmt);
    }

    final computedBill = updatedItems.fold<double>(0.0, (sum, it) => sum + (it.deliveryQty * it.cylinder.price));
    final finalBillTotal = computedBill > 0 ? computedBill : oldOrder.billTotal;

    orders[index] = DeliveryOrder(
      ticketId: oldOrder.ticketId,
      salesId: oldOrder.salesId,
      customer: oldOrder.customer,
      items: updatedItems,
      totalCylinders: totalDeliv,
      totalEmpties: totalEmpty,
      amount: newAmount,
      billTotal: finalBillTotal,
      paymentMethod: newPaymentMethod,
      cashAmount: finalCashAmt,
      upiAmount: finalUpiAmt,
      time: oldOrder.time,
      status: oldOrder.status,
      stopNumber: oldOrder.stopNumber,
    );

    lastSyncTime = DateTime.now();
    notifyListeners();

    // 3. Live sync to backend
    try {
      final backendItems = updatedItems.map((it) => {
        'product_id': it.cylinder.productId,
        'weight': it.cylinder.weight,
        'qty': it.deliveryQty,
        'empty_qty': it.emptyReturnQty,
        'price': it.cylinder.price,
      }).toList();

      final res = await ApiService.updateSale(
        ticketId: ticketId,
        salesId: oldOrder.salesId,
        amountCollected: newAmount,
        paymentMethod: newPaymentMethod,
        cashAmount: finalCashAmt,
        upiAmount: finalUpiAmt,
        items: backendItems,
      );
      if (res['success'] == true) {
        fetchCustomers();
        syncFromBackend();
      }
      return res['success'] == true;
    } catch (e) {
      debugPrint('Live backend order update error: $e');
      return false;
    }
  }

  Future<bool> updateOrderAmount(String ticketId, double newAmount, {String? newPaymentMethod, double? cashAmount, double? upiAmount}) async {
    final index = orders.indexWhere((o) => o.ticketId == ticketId);
    if (index == -1) return false;

    final oldOrder = orders[index];
    final pm = newPaymentMethod ?? oldOrder.paymentMethod;
    final pmLower = pm.toLowerCase();
    double? finalCashAmt = cashAmount;
    double? finalUpiAmt = upiAmount;
    if (pmLower == 'cash') {
      finalCashAmt = newAmount;
      finalUpiAmt = 0.0;
    } else if (pmLower.contains('upi') || pmLower.contains('bank') || pmLower.contains('online')) {
      finalCashAmt = 0.0;
      finalUpiAmt = newAmount;
    } else if (pmLower == 'credit') {
      finalCashAmt = 0.0;
      finalUpiAmt = 0.0;
    } else if (pmLower == 'split') {
      finalCashAmt = cashAmount ?? (newAmount / 2);
      finalUpiAmt = upiAmount ?? (newAmount - finalCashAmt);
    }

    orders[index] = DeliveryOrder(
      ticketId: oldOrder.ticketId,
      salesId: oldOrder.salesId,
      customer: oldOrder.customer,
      items: oldOrder.items,
      totalCylinders: oldOrder.totalCylinders,
      totalEmpties: oldOrder.totalEmpties,
      amount: newAmount,
      billTotal: oldOrder.billTotal,
      paymentMethod: pm,
      cashAmount: finalCashAmt,
      upiAmount: finalUpiAmt,
      time: oldOrder.time,
      status: oldOrder.status,
      stopNumber: oldOrder.stopNumber,
    );
    lastSyncTime = DateTime.now();
    notifyListeners();

    try {
      final res = await ApiService.updateSale(
        ticketId: ticketId,
        salesId: oldOrder.salesId,
        amountCollected: newAmount,
        paymentMethod: pm,
        cashAmount: finalCashAmt,
        upiAmount: finalUpiAmt,
      );
      if (res['success'] == true) {
        fetchCustomers();
        syncFromBackend();
      }
      return res['success'] == true;
    } catch (e) {
      debugPrint('Live backend order update error: $e');
      return false;
    }
  }

  /// Driver End Shift action
  Future<Map<String, dynamic>> submitEndShift({
    required List<Map<String, dynamic>> remainingCylinders,
    required List<Map<String, dynamic>> remainingOther,
  }) async {
    if (currentAllocationId == null) {
      return {'success': false, 'message': 'No active allocation found.'};
    }

    try {
      final res = await ApiService.endShift(
        allocationId: currentAllocationId!,
        remainingCylinders: remainingCylinders,
        remainingOther: remainingOther,
        totalCollected: todayCollectedTotal,
        totalDeliveries: orders.length,
        cashCollected: cashBalance,
        bankCollected: bankBalance,
      );
      if (res['success'] == true) {
        endShiftStatus = 'PENDING';
        // When shift ends and waits for approval, store all data in the mobile app until admin approval is completed!
      }
      lastSyncTime = DateTime.now();
      notifyListeners();
      return res;
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }


  void collectEmptyCylinder(Customer customer, CylinderType cylinder, int qty) {
    cylinder.emptyStock += qty;
    notifyListeners();
  }

  void collectEmptyCylindersBatch(Customer customer, Map<CylinderType, int> collectedItems) {
    final List<DeliveryItem> itemsList = [];
    int totalCount = 0;

    collectedItems.forEach((cyl, count) {
      if (count > 0) {
        cyl.emptyStock += count;
        totalCount += count;
        itemsList.add(DeliveryItem(
          cylinder: cyl,
          deliveryQty: 0,
          emptyReturnQty: count,
        ));
      }
    });

    if (totalCount > 0) {
      _stopCounter++;
      final now = TimeOfDay.now();
      final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
      final period = now.period == DayPeriod.am ? 'AM' : 'PM';
      final timeStr =
          '${hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} $period';

      _orderCounter++;
      orders.insert(
        0,
        DeliveryOrder(
          ticketId: 'ER-${88490 + _orderCounter}',
          customer: customer,
          items: itemsList,
          totalCylinders: 0,
          totalEmpties: totalCount,
          amount: 0.0,
          paymentMethod: 'Empty Return',
          time: timeStr,
          stopNumber: _stopCounter,
        ),
      );
    }
    notifyListeners();
  }

  void resetDelivery() {
    selectedCustomer = null;
    paymentMethod = 'Cash';
    collectedAmount = 0;
    otherDeliveryQty.clear();
    _initDeliveryItems(forceReset: true);
    notifyListeners();
  }

  // ================= DRIVER EXPENSES & BALANCE =================
  final List<DriverExpense> expenses = [];

  void addExpense({required String title, required double amount, required String paymentMethod}) {
    if (isShiftLocked || endShiftStatus.toUpperCase() != 'ACTIVE') {
      debugPrint('Cannot add expense: Shift is ended and locked.');
      return;
    }
    final now = TimeOfDay.now();
    final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
    final period = now.period == DayPeriod.am ? 'AM' : 'PM';
    final timeStr = '${hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} $period';

    final tempId = 'EXP-${DateTime.now().millisecondsSinceEpoch}';
    final expItem = DriverExpense(
      id: tempId,
      title: title,
      amount: amount,
      paymentMethod: paymentMethod,
      time: timeStr,
    );
    expenses.insert(0, expItem);
    notifyListeners();

    if (currentAllocationId != null) {
      ApiService.createDriverExpense(
        allocationId: currentAllocationId!,
        category: title,
        amount: amount,
        paymentMethod: paymentMethod,
      ).then((res) {
        if (res['success'] == true && res['id'] != null) {
          expItem.id = res['id'].toString();
          notifyListeners();
        }
      }).catchError((e) {
        debugPrint('Failed to save expense to backend: $e');
      });
    }
  }

  void deleteExpense(String id) {
    expenses.removeWhere((e) => e.id == id);
    notifyListeners();

    ApiService.deleteDriverExpense(id).catchError((e) {
      debugPrint('Failed to delete expense from backend: $e');
      return false;
    });
  }

  double get cashIncome => isSettledShift ? 0.0 : orders
      .fold(0.0, (sum, o) {
        final pm = o.paymentMethod.toLowerCase();
        if (pm == 'credit' || pm == 'n/a' || (o.amount <= 0 && (o.cashAmount == null || o.cashAmount! <= 0))) {
          return sum;
        }
        if (pm == 'split') {
          return sum + (o.cashAmount ?? 0.0);
        } else if (pm == 'cash' || (o.cashAmount != null && o.cashAmount! > 0) || (!pm.contains('upi') && !pm.contains('bank') && o.amount > 0)) {
          return sum + (o.cashAmount != null && o.cashAmount! > 0 ? o.cashAmount! : o.amount);
        }
        return sum;
      });

  double get upiIncome => isSettledShift ? 0.0 : orders
      .fold(0.0, (sum, o) {
        final pm = o.paymentMethod.toLowerCase();
        if (pm == 'credit' || pm == 'n/a' || (o.amount <= 0 && (o.upiAmount == null || o.upiAmount! <= 0))) {
          return sum;
        }
        if (pm == 'split') {
          return sum + (o.upiAmount ?? 0.0);
        } else if (pm.contains('upi') || pm.contains('bank') || pm.contains('online') || (o.upiAmount != null && o.upiAmount! > 0)) {
          return sum + (o.upiAmount != null && o.upiAmount! > 0 ? o.upiAmount! : o.amount);
        }
        return sum;
      });

  double get totalIncome => cashIncome + upiIncome;

  double get cashExpense => isSettledShift ? 0.0 : expenses
      .where((e) => e.paymentMethod.toLowerCase() == 'cash')
      .fold(0.0, (sum, e) => sum + e.amount);

  double get upiExpense => isSettledShift ? 0.0 : expenses
      .where((e) => e.paymentMethod.toLowerCase().contains('upi') || e.paymentMethod.toLowerCase().contains('bank'))
      .fold(0.0, (sum, e) => sum + e.amount);

  double get totalExpense => cashExpense + upiExpense;

  double get cashBalance => isSettledShift ? 0.0 : (cashIncome - cashExpense);
  double get upiBalance => isSettledShift ? 0.0 : (upiIncome - upiExpense);
  double get netBalance => isSettledShift ? 0.0 : (totalIncome - totalExpense);

  // Aliases for Bank
  double get bankIncome => upiIncome;
  double get bankExpense => upiExpense;
  double get bankBalance => upiBalance;

  // ================= ADMIN DEPOT STATE & ACTIONS =================
  Map<String, dynamic> adminSummary = {};
  List<Map<String, dynamic>> adminGodowns = [];
  List<Map<String, dynamic>> adminVans = [];
  List<Map<String, dynamic>> adminRecentNotes = [];
  List<Map<String, dynamic>> adminAllocations = [];
  List<Map<String, dynamic>> adminCatalogProducts = [];
  double adminSalesToday = 0.0;
  double adminCashToday = 0.0;
  double adminUpiToday = 0.0;
  List<AdminDriver> fleetDrivers = [];

  // Helper getters for driver-specific revenue & expenses
  double getDriverCashIncome(AdminDriver driver) {
    if (driver.id == 'DRV001') {
      return cashIncome > 0 ? cashIncome : driver.mockCashIncome;
    }
    return driver.mockCashIncome;
  }

  double getDriverUpiIncome(AdminDriver driver) {
    if (driver.id == 'DRV001') {
      return upiIncome > 0 ? upiIncome : driver.mockUpiIncome;
    }
    return driver.mockUpiIncome;
  }

  double getDriverTotalIncome(AdminDriver driver) {
    return getDriverCashIncome(driver) + getDriverUpiIncome(driver);
  }

  List<DriverExpense> getDriverExpenses(AdminDriver driver) {
    if (driver.id == 'DRV001') {
      return expenses.isNotEmpty ? expenses : driver.mockExpenses;
    }
    return driver.mockExpenses;
  }

  double getDriverTotalExpense(AdminDriver driver) {
    return getDriverExpenses(driver).fold(0.0, (sum, e) => sum + e.amount);
  }

  double getDriverNetBalance(AdminDriver driver) {
    return getDriverTotalIncome(driver) - getDriverTotalExpense(driver);
  }

  // Depot wide total revenue calculations (live backend sales first, fallback to drivers)
  double get adminTotalRevenueToday {
    if (adminSalesToday > 0) return adminSalesToday;
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverTotalIncome(d));
  }

  double get adminTotalCashToday {
    if (adminCashToday > 0) return adminCashToday;
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverCashIncome(d));
  }

  double get adminTotalUpiToday {
    if (adminUpiToday > 0) return adminUpiToday;
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverUpiIncome(d));
  }

  double get adminTotalExpensesToday {
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverTotalExpense(d));
  }

  List<WarehouseItem> warehouseItems = [];

  int get totalWarehouseFilled {
    if (adminSummary.containsKey('total_godown_filled')) {
      return safeInt(adminSummary['total_godown_filled']);
    }
    return warehouseItems.fold(0, (sum, i) => sum + i.filledStock);
  }

  int get totalWarehouseEmpty {
    if (adminSummary.containsKey('total_godown_empty')) {
      return safeInt(adminSummary['total_godown_empty']);
    }
    return warehouseItems.fold(0, (sum, i) => sum + i.emptyStock);
  }

  int get totalVansOnboardFilled {
    if (adminSummary.containsKey('total_allocated_filled')) {
      return safeInt(adminSummary['total_allocated_filled']);
    }
    return adminVans.fold(0, (sum, v) => sum + safeInt(v['TotalCylinders'] ?? v['AllocatedCylinders']));
  }

  int get totalActiveVansCount {
    if (adminSummary.containsKey('active_vans_count')) {
      return safeInt(adminSummary['active_vans_count']);
    }
    return adminVans.where((v) => safeInt(v['TotalCylinders']) > 0).length;
  }

  int get totalRegisteredVansCount {
    if (adminSummary.containsKey('total_registered_vans')) {
      return safeInt(adminSummary['total_registered_vans']);
    }
    return vehicles.isNotEmpty ? vehicles.length : 6;
  }

  int get totalActiveDrivers => fleetDrivers.where((d) => d.active).length;

  /// Authoritative backend sync for Admin & Manager logins
  Future<void> fetchAdminData() async {
    isLoadingFromBackend = true;
    notifyListeners();

    try {
      // 1. Fetch live Stock Analysis (Godowns, Active Vans, and System Summary)
      final analysis = await ApiService.getStockAnalysis();
      if (analysis != null) {
        adminSummary = analysis['summary'] as Map<String, dynamic>? ?? {};
        adminGodowns = List<Map<String, dynamic>>.from(analysis['godowns'] as List? ?? []);
        adminVans = List<Map<String, dynamic>>.from(analysis['all_vans'] as List? ?? []);
        adminRecentNotes = List<Map<String, dynamic>>.from(analysis['recent_notes'] as List? ?? []);

        final products = analysis['products'] as List? ?? [];
        warehouseItems = products.map((p) {
          final w = (p['AppProductName'] != null && p['AppProductName'].toString().trim().isNotEmpty)
              ? p['AppProductName'].toString().trim()
              : (p['ProductName'] ?? '').toString();
          return WarehouseItem(
            weight: w,
            title: (p['ProductName'] ?? '').toString(),
            filledStock: safeInt(p['InGodown']),
            emptyStock: 0,
            price: safeDouble(p['SalesPrice']),
          );
        }).toList();
      }

      // 2. Fetch live Allocations
      final rawAllocations = await ApiService.getAllocations();
      adminAllocations = rawAllocations.where((a) {
        final rName = (a['RouteName'] ?? a['route_name'] ?? '').toString().toLowerCase();
        final vPlate = (a['VehicleNumber'] ?? a['vehicle_number'] ?? '').toString().toLowerCase();
        return !rName.contains('godown') && !rName.contains('depot') && !vPlate.contains('godown') && !vPlate.contains('central');
      }).toList();

      // 3. Fetch live Vehicles
      final rawVehicles = await ApiService.getVehicles();
      availableVehicles.clear();
      vehicles.clear();
      for (final v in rawVehicles) {
        final plate = (v['VehicleNumber'] ?? v['plate_number'] ?? '').toString().trim().toUpperCase();
        if (plate.isNotEmpty && !plate.toLowerCase().contains('godown') && !availableVehicles.contains(plate)) {
          availableVehicles.add(plate);

          final alloc = adminAllocations.firstWhere(
            (a) => (a['VehicleNumber'] ?? a['vehicle_number'] ?? '').toString().trim().toUpperCase() == plate,
            orElse: () => {},
          );
          vehicles.add(DepotVehicle(
            plateNumber: plate,
            model: (v['Model'] ?? v['VehicleType'] ?? 'Delivery Van').toString(),
            assignedDriverName: (alloc['DriverName'] ?? alloc['driver_name'] ?? 'Unassigned').toString(),
            assignedDriverId: alloc['Driver'] != null ? 'DRV${alloc['Driver']}' : '',
            route: (alloc['RouteName'] ?? alloc['route_name'] ?? 'No Route').toString(),
            status: alloc.isNotEmpty ? 'Active Route' : 'Ready in Depot',
          ));
        }
      }

      // 4. Fetch live Drivers
      final rawDrivers = await ApiService.getDrivers();
      fleetDrivers.clear();
      for (final d in rawDrivers) {
        final dId = d['DriverId'] ?? d['id'];
        final dName = (d['DriverName'] ?? d['name'] ?? 'Driver').toString().trim();
        final dPhone = (d['Phone'] ?? d['phone'] ?? '').toString().trim();

        final alloc = adminAllocations.firstWhere(
          (a) => (a['Driver'] == dId) || ((a['DriverName'] ?? '').toString().trim().toLowerCase() == dName.toLowerCase()),
          orElse: () => {},
        );

        final plate = (alloc['VehicleNumber'] ?? alloc['vehicle_number'] ?? '').toString().trim().toUpperCase();
        final route = (alloc['RouteName'] ?? alloc['route_name'] ?? '').toString().trim();

        int onboardCount = 0;
        final matchedVan = adminVans.firstWhere(
          (v) => (v['VehicleNumber'] ?? '').toString().trim().toUpperCase() == plate,
          orElse: () => {},
        );
        if (matchedVan.isNotEmpty) {
          onboardCount = safeInt(matchedVan['TotalCylinders']);
        }

        fleetDrivers.add(AdminDriver(
          id: 'DRV$dId',
          name: dName,
          phone: dPhone,
          vehicle: plate,
          route: route.isNotEmpty ? route : 'Unassigned',
          cylindersOnboard: onboardCount,
          active: d['IsActive'] == true,
        ));
      }

      // 5. Fetch live Catalog Products
      final rawProducts = await ApiService.getProducts();
      adminCatalogProducts = rawProducts.where((p) {
        final name = (p['ProductName'] ?? '').toString().toLowerCase();
        return name.contains('cylinder') || name.contains('kg') || name.contains('lpg');
      }).toList();

      // 6. Fetch live Fleet Sales for Today
      final allSales = await ApiService.getFleetSales();
      final now = DateTime.now();
      final todayStr = "${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}";

      double totalTodayRevenue = 0.0;
      double totalTodayCash = 0.0;
      double totalTodayUpi = 0.0;

      for (final s in allSales) {
        final sDate = (s['SalesDate'] ?? s['date'] ?? '').toString();
        if (sDate.startsWith(todayStr)) {
          final pMethod = (s['PaymentMode'] ?? s['PaymentMethod'] ?? '').toString().toUpperCase();
          if (pMethod == 'CREDIT' || pMethod == 'N/A') {
            continue;
          }
          final amt = safeDouble(s['PaidAmount'] ?? s['AmountCollected'] ?? 0);
          if (amt <= 0) {
            continue;
          }
          totalTodayRevenue += amt;
          if (pMethod == 'SPLIT') {
            final cAmt = safeDouble(s['cash_amount']);
            final uAmt = safeDouble(s['upi_amount'] ?? s['bank_amount']);
            if (cAmt > 0 || uAmt > 0) {
              totalTodayCash += cAmt;
              totalTodayUpi += uAmt;
            } else {
              final notes = (s['Notes'] ?? '').toString();
              final cashMatch = RegExp(r'Cash:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)').firstMatch(notes);
              final upiMatch = RegExp(r'UPI:\s*[₹Rs\.]*\s*([\d,]+\.?\d*)').firstMatch(notes);
              final cVal = cashMatch != null ? safeDouble(cashMatch.group(1)!.replaceAll(',', '')) : amt / 2;
              final uVal = upiMatch != null ? safeDouble(upiMatch.group(1)!.replaceAll(',', '')) : amt - cVal;
              totalTodayCash += cVal;
              totalTodayUpi += uVal;
            }
          } else if (pMethod.contains('CASH')) {
            totalTodayCash += amt;
          } else {
            totalTodayUpi += amt;
          }
        }
      }

      adminSalesToday = totalTodayRevenue;
      adminCashToday = totalTodayCash;
      adminUpiToday = totalTodayUpi;
    } catch (e) {
      debugPrint('Error fetching admin data: $e');
    } finally {
      isLoadingFromBackend = false;
      lastSyncTime = DateTime.now();
      notifyListeners();
    }
  }

  /// Authoritative backend Delivery Note creation from mobile app
  Future<Map<String, dynamic>> submitVehicleAllocation({
    required int allocationId,
    int godownId = 1,
    required List<Map<String, dynamic>> lines,
    String? remarks,
  }) async {
    final res = await ApiService.createDeliveryNote(
      allocationId: allocationId,
      godownId: godownId,
      lines: lines,
      remarks: remarks,
    );

    if (res['success'] == true) {
      await fetchAdminData();
    }
    return res;
  }

  void addNewVehicle({
    required String plateNumber,
    String model = 'Tata 407 Delivery Truck',
    String route = 'Route #1A',
  }) {
    final cleanPlate = plateNumber.trim().toUpperCase();
    if (!availableVehicles.contains(cleanPlate)) {
      availableVehicles.add(cleanPlate);
    }
    if (!vehicles.any((v) => v.plateNumber == cleanPlate)) {
      vehicles.insert(
        0,
        DepotVehicle(
          plateNumber: cleanPlate,
          model: model,
          assignedDriverName: 'Unassigned',
          assignedDriverId: '',
          route: route,
          status: 'Ready in Depot',
        ),
      );
    }
    notifyListeners();
  }

  void addNewDriver({
    required String name,
    required String phone,
    required String password,
    String vehicle = '',
  }) {
    final newId = 'DRV00${fleetDrivers.length + 1}';
    fleetDrivers.insert(
      0,
      AdminDriver(
        id: newId,
        name: name.trim(),
        phone: phone.trim(),
        password: password.trim().isEmpty ? '1234' : password.trim(),
        vehicle: vehicle.trim(),
        route: 'Route #1A',
        active: true,
      ),
    );
    notifyListeners();
  }

  void reloadTruckStock(String weight, int qty) {
    if (warehouseItems.isEmpty || cylinders.isEmpty) return;
    final wh = warehouseItems.firstWhere((w) => w.weight == weight, orElse: () => warehouseItems[0]);
    final truckCyl = cylinders.firstWhere((c) => c.weight == weight, orElse: () => cylinders[0]);

    if (wh.filledStock >= qty) {
      wh.filledStock -= qty;
      truckCyl.filledStock += qty;
      if (fleetDrivers.isNotEmpty) {
        fleetDrivers[0].cylindersOnboard = truckStock;
      }
      notifyListeners();
    }
  }

  void addWarehouseRefill(String weight, int qty) {
    if (warehouseItems.isEmpty) return;
    final wh = warehouseItems.firstWhere((w) => w.weight == weight, orElse: () => warehouseItems[0]);
    wh.filledStock += qty;
    notifyListeners();
  }

  void settleCustomerDue(Customer customer, double amount) {
    if (customer.outstanding > 0) {
      customer.outstanding = (customer.outstanding - amount).clamp(0.0, double.infinity);
      notifyListeners();
    }
  }

  void toggleDriverStatus(AdminDriver driver) {
    driver.active = !driver.active;
    notifyListeners();
  }

  void allocateVehicleAndStock({
    required String driverId,
    required String vehicle,
    required String route,
    required Map<String, int> stockByWeight,
  }) {
    final totalFilled = stockByWeight.values.fold(0, (sum, q) => sum + q);

    final index = fleetDrivers.indexWhere((d) => d.id == driverId);
    if (index != -1) {
      fleetDrivers[index].vehicle = vehicle;
      fleetDrivers[index].route = route;
      fleetDrivers[index].cylindersOnboard = totalFilled;
      fleetDrivers[index].stockAllocation = Map<String, int>.from(stockByWeight);
      fleetDrivers[index].active = true;
    }

    // If allocating for John (the primary logged-in driver DRV001)
    if (driverId == 'DRV001') {
      vehicleNumber = vehicle;
      routeInfo = route;
      for (final cyl in cylinders) {
        if (stockByWeight.containsKey(cyl.weight)) {
          cyl.filledStock = stockByWeight[cyl.weight]!;
        }
      }
      _initDeliveryItems();
    }

    notifyListeners();
  }

  void allocateStockToVehicle({
    required String plateNumber,
    required Map<String, int> stockByWeight,
    String? assignedDriverName,
    String? route,
  }) {
    final totalFilled = stockByWeight.values.fold(0, (sum, q) => sum + q);

    // 1. Update in vehicles list
    final vIndex = vehicles.indexWhere((v) => v.plateNumber == plateNumber);
    if (vIndex != -1) {
      vehicles[vIndex].stock = Map<String, int>.from(stockByWeight);
      vehicles[vIndex].status = 'Stock Loaded';
      if (assignedDriverName != null && assignedDriverName.isNotEmpty) {
        vehicles[vIndex].assignedDriverName = assignedDriverName;
      }
      if (route != null && route.isNotEmpty) {
        vehicles[vIndex].route = route;
      }
    } else {
      vehicles.insert(
        0,
        DepotVehicle(
          plateNumber: plateNumber,
          assignedDriverName: assignedDriverName ?? 'John Driver',
          assignedDriverId: 'DRV001',
          route: route ?? 'Route #4B',
          status: 'Stock Loaded',
          stock: Map<String, int>.from(stockByWeight),
        ),
      );
    }

    // 2. Also keep fleetDrivers in sync
    final dIndex = fleetDrivers.indexWhere((d) => d.vehicle == plateNumber);
    if (dIndex != -1) {
      fleetDrivers[dIndex].stockAllocation = Map<String, int>.from(stockByWeight);
      fleetDrivers[dIndex].cylindersOnboard = totalFilled;
      fleetDrivers[dIndex].active = true;
    }

    // 3. If allocating for active driver truck
    if (plateNumber == vehicleNumber || (vIndex != -1 && vehicles[vIndex].assignedDriverId == 'DRV001')) {
      vehicleNumber = plateNumber;
      if (route != null && route.isNotEmpty) routeInfo = route;
      for (final cyl in cylinders) {
        if (stockByWeight.containsKey(cyl.weight)) {
          cyl.filledStock = stockByWeight[cyl.weight]!;
        }
      }
      _initDeliveryItems();
    }

    notifyListeners();
  }
}

/// InheritedWidget to provide AppState down the tree
class AppStateProvider extends InheritedWidget {
  final AppState state;

  const AppStateProvider({
    super.key,
    required this.state,
    required super.child,
  });

  static AppState of(BuildContext context) {
    return context.dependOnInheritedWidgetOfExactType<AppStateProvider>()!.state;
  }

  @override
  bool updateShouldNotify(AppStateProvider oldWidget) => true;
}
