import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

/// Data models and app state management
class CylinderType {
  final int? productId;
  final String weight;
  final double price;
  int initialFilledStock;
  int filledStock;
  int emptyStock;

  CylinderType({
    this.productId,
    required this.weight,
    required this.price,
    required this.filledStock,
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
  final String categoryName;
  int initialStock;
  int deliveredStock;
  int balanceStock;

  OtherProductItem({
    this.productId,
    required this.name,
    required this.price,
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
  double outstanding;

  Customer({
    this.ledgerId,
    required this.name,
    required this.phone,
    this.address = '',
    this.shopId,
    this.type = 'Regular',
    this.creditLimit = 15000,
    this.outstanding = 0,
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
  final String ticketId;
  final Customer customer;
  final List<DeliveryItem> items;
  final int totalCylinders;
  final int totalEmpties;
  final double amount;
  final String paymentMethod;
  final String time;
  final String status;
  final int stopNumber;

  DeliveryOrder({
    required this.ticketId,
    required this.customer,
    required this.items,
    required this.totalCylinders,
    required this.totalEmpties,
    required this.amount,
    required this.paymentMethod,
    required this.time,
    this.status = 'Delivered',
    this.stopNumber = 1,
  });

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
  final String id;
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
  })  : stockAllocation = stockAllocation ?? {
          '33 KG': 4,
          '21 KG': 6,
          '17 KG': 24,
          '12 KG': 10,
          '4 KG': 6,
        },
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
    _stock ??= {
      '33 KG': 0,
      '21 KG': 0,
      '17 KG': 0,
      '12 KG': 0,
      '4 KG': 0,
    };
    return _stock!;
  }

  set stock(Map<String, int> val) {
    _stock = val;
  }

  Map<String, int> get emptyStock {
    _emptyStock ??= {
      '33 KG': 0,
      '21 KG': 0,
      '17 KG': 0,
      '12 KG': 0,
      '4 KG': 0,
    };
    return _emptyStock!;
  }

  set emptyStock(Map<String, int> val) {
    _emptyStock = val;
  }

  int get totalCylinders => stock.values.fold(0, (sum, q) => sum + q);
  int get totalEmpties => emptyStock.values.fold(0, (sum, q) => sum + q);
}

class AppState extends ChangeNotifier {
  // Theme info
  bool isDarkMode = false;

  void toggleTheme() {
    isDarkMode = !isDarkMode;
    notifyListeners();
  }

  // Driver info
  String driverName = 'Arjun';
  String fullName = 'Arjun';
  String driverId = 'DRV001';
  int? currentDriverDbId;
  int? currentAllocationId;
  String vehicleNumber = 'KL 77 3803';
  String routeInfo = 'Kecheri - Kunnamkulam';
  bool isLoadingFromBackend = false;
  DateTime? lastSyncTime;

  // Depot Vehicle Fleet (Freshly initialized with 0 stock ready for allocation)
  List<DepotVehicle> vehicles = [
    DepotVehicle(
      plateNumber: 'KL 77 3803',
      model: 'Tata 407 Heavy Express',
      assignedDriverName: 'John Driver',
      assignedDriverId: 'DRV001',
      route: 'Route #4B \u2022 Bay 3 Loading',
      status: 'Ready in Depot',
      stock: {
        '33 KG': 0,
        '21 KG': 0,
        '17 KG': 40,
        '12 KG': 8,
        '4 KG': 0,
      },
      emptyStock: {
        '33 KG': 0,
        '21 KG': 0,
        '17 KG': 0,
        '12 KG': 0,
        '4 KG': 0,
      },
    ),
    DepotVehicle(
      plateNumber: 'KL 11 BH 4021',
      model: 'Ashok Leyland Dost',
      assignedDriverName: 'Rahul Kumar',
      assignedDriverId: 'DRV002',
      route: 'Route #2A \u2022 Bay 1 West',
      status: 'Ready in Depot',
    ),
    DepotVehicle(
      plateNumber: 'KL 08 CZ 9912',
      model: 'Mahindra Bolero Maxi Truck',
      assignedDriverName: 'Suresh Nair',
      assignedDriverId: 'DRV003',
      route: 'Route #5C \u2022 Bay 4 North',
      status: 'Ready in Depot',
    ),
    DepotVehicle(
      plateNumber: 'KL 22 5501',
      model: 'Eicher Pro 2049 Standard',
      assignedDriverName: 'Anil Menon',
      assignedDriverId: 'DRV004',
      route: 'Depot Standby / Fleet Reserve',
      status: 'In Depot',
    ),
    DepotVehicle(
      plateNumber: 'KL 11 2233',
      model: 'Tata Ace Gold Utility',
      assignedDriverName: 'Pradeep Varma',
      assignedDriverId: 'DRV005',
      route: 'Route #1D \u2022 Bay 2 South',
      status: 'Ready in Depot',
    ),
    DepotVehicle(
      plateNumber: 'KL 33 4455',
      model: 'Tata 407 Delivery Truck',
      assignedDriverName: 'Unassigned',
      assignedDriverId: '',
      route: 'Standby Fleet',
      status: 'In Depot',
    ),
    DepotVehicle(
      plateNumber: 'KL 55 6677',
      model: 'Mahindra Loadking Star',
      assignedDriverName: 'Unassigned',
      assignedDriverId: '',
      route: 'Bay 5 Reserve',
      status: 'In Depot',
    ),
  ];

  // Depot Vehicle Fleet available for allocation
  final List<String> availableVehicles = [
    'KL 77 3803',
    'KL 11 BH 4021',
    'KL 08 CZ 9912',
    'KL 22 5501',
    'KL 11 2233',
    'KL 33 4455',
    'KL 55 6677',
  ];

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
  final List<Customer> customers = [];

  // Orders
  final List<DeliveryOrder> orders = [];
  int _orderCounter = 0;
  int _stopCounter = 0;

  // Current delivery state
  Customer? selectedCustomer;
  late List<DeliveryItem> deliveryItems;
  Map<String, int> otherDeliveryQty = {};
  String paymentMethod = '';
  double collectedAmount = 0;

  AppState() {
    _initDeliveryItems();
    loadCachedAllocation();
  }

  void _initDeliveryItems() {
    deliveryItems = cylinders
        .map((c) => DeliveryItem(cylinder: c))
        .toList();
  }

  Future<void> loadCachedAllocation() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cachedVehicle = prefs.getString('cached_vehicle_number');
      final cachedRoute = prefs.getString('cached_route_info');
      final cachedDriver = prefs.getString('cached_driver_name');
      final cachedAllocId = prefs.getInt('cached_allocation_id');

      bool changed = false;
      if (cachedVehicle != null && cachedVehicle.isNotEmpty) {
        vehicleNumber = cachedVehicle;
        changed = true;
      }
      if (cachedRoute != null && cachedRoute.isNotEmpty) {
        routeInfo = cachedRoute;
        changed = true;
      }
      if (cachedDriver != null && cachedDriver.isNotEmpty) {
        driverName = cachedDriver;
        changed = true;
      }
      if (cachedAllocId != null) {
        currentAllocationId = cachedAllocId;
      }
      if (changed) {
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> _persistAllocationCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_vehicle_number', vehicleNumber);
      await prefs.setString('cached_route_info', routeInfo);
      await prefs.setString('cached_driver_name', driverName);
      if (currentAllocationId != null) {
        await prefs.setInt('cached_allocation_id', currentAllocationId!);
      }
    } catch (_) {}
  }

  Future<void> syncFromBackend({int? driverIdParam}) async {
    isLoadingFromBackend = true;
    notifyListeners();

    try {
      final user = await ApiService.getSavedUser();
      final dId = driverIdParam ?? (user != null ? (user['driver_id'] ?? user['DriverId']) as int? : null);
      if (user != null) {
        final uname = user['username']?.toString().trim();
        if (uname != null && uname.isNotEmpty) {
          driverName = uname;
          fullName = uname;
        }
      }

      if (dId != null && dId > 0) {
        currentDriverDbId = dId;
        driverId = 'DRV$dId';
      }

      final alloc = await ApiService.getDriverAllocation(dId);
      if (alloc != null) {
        currentAllocationId = (alloc['RouteVehicleDriverId'] ?? alloc['id']) as int?;

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

        _persistAllocationCache();

        if (currentAllocationId != null) {
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

            // Load cylinders strictly from backend DB van-stock (0 empty stock by default)
            cylinders = cylItems.map((s) => CylinderType(
              productId: s['ProductId'] as int?,
              weight: (s['AppProductName'] != null && s['AppProductName'].toString().trim().isNotEmpty)
                  ? s['AppProductName'].toString().trim()
                  : (s['ProductName'] ?? '').toString(),
              price: (s['SalesPrice'] as num?)?.toDouble() ?? 0.0,
              initialFilledStock: (s['OnboardQty'] as num?)?.toInt() ?? 0,
              filledStock: (s['OnboardQty'] as num?)?.toInt() ?? 0,
              emptyStock: 0,
            )).toList();
            _initDeliveryItems();

            // Load only Other Products allocated to this vehicle (onboard stock > 0)
            otherProducts = otherItems
                .where((s) => ((s['OnboardQty'] as num?)?.toInt() ?? 0) > 0)
                .map((s) => OtherProductItem(
                  productId: s['ProductId'] as int?,
                  name: (s['AppProductName'] != null && s['AppProductName'].toString().trim().isNotEmpty)
                      ? s['AppProductName'].toString().trim()
                      : (s['ProductName'] ?? '').toString(),
                  price: (s['SalesPrice'] as num?)?.toDouble() ?? 0.0,
                  categoryName: (s['CategoryName'] ?? 'Other Items').toString(),
                  initialStock: (s['OnboardQty'] as num?)?.toInt() ?? 0,
                  deliveredStock: 0,
                  balanceStock: (s['OnboardQty'] as num?)?.toInt() ?? 0,
                ))
                .toList();
          }
        }
        // Fetch Driver's Sales for Today from Backend
        if (currentAllocationId != null) {
          try {
            final backendSales = await ApiService.getDriverSales(currentAllocationId!);
            if (backendSales.isNotEmpty) {
              orders.clear();
              for (final s in backendSales) {
                final cData = s['customer'] as Map<String, dynamic>? ?? {};
                final itemsList = (s['items'] as List? ?? []).map((it) {
                  final w = it['weight']?.toString() ?? '';
                  final matchedCyl = cylinders.firstWhere(
                    (c) => c.weight == w,
                    orElse: () => CylinderType(
                      productId: it['productId'] as int?,
                      weight: w,
                      price: (it['rate'] as num?)?.toDouble() ?? 0.0,
                      filledStock: 0,
                    ),
                  );
                  return DeliveryItem(
                    cylinder: matchedCyl,
                    deliveryQty: (it['deliveryQty'] as num?)?.toInt() ?? 0,
                    emptyReturnQty: (it['emptyReturnQty'] as num?)?.toInt() ?? 0,
                  );
                }).toList();

                orders.add(DeliveryOrder(
                  ticketId: s['ticketId'] ?? 'DT-ORD',
                  customer: Customer(
                    ledgerId: cData['ledgerId'] as int?,
                    name: cData['name'] ?? 'Customer',
                    phone: '',
                  ),
                  items: itemsList,
                  totalCylinders: (s['totalCylinders'] as num?)?.toInt() ?? 0,
                  totalEmpties: (s['totalEmpties'] as num?)?.toInt() ?? 0,
                  amount: (s['amount'] as num?)?.toDouble() ?? 0.0,
                  paymentMethod: s['paymentMethod'] ?? 'Cash',
                  time: s['time'] ?? '10:00 AM',
                  status: s['status'] ?? 'Delivered',
                ));
              }
            }
          } catch (e) {
            debugPrint('Failed to load driver sales: $e');
          }
        }
      }

      // Customers from Backend
      final backendCustomers = await ApiService.getCustomers();
      if (backendCustomers.isNotEmpty) {
        customers.clear();
        for (final c in backendCustomers) {
          final balance = (c['CurrentBalance'] as num?)?.toDouble() ?? 0.0;
          customers.add(Customer(
            ledgerId: c['LedgerId'],
            name: c['LedgerName'] ?? '',
            phone: c['Phone'] ?? '',
            address: c['AddressLine1'] ?? '',
            outstanding: balance,
          ));
        }
      }

      // If cylinders empty, fetch products from catalog
      if (cylinders.isEmpty) {
        final products = await ApiService.getProducts();
        if (products.isNotEmpty) {
          cylinders = products.map((p) => CylinderType(
            productId: p['ProductId'],
            weight: (p['AppProductName'] != null && p['AppProductName'].toString().trim().isNotEmpty)
                ? p['AppProductName'].toString().trim()
                : (p['ProductName'] ?? ''),
            price: (p['SalesPrice'] as num?)?.toDouble() ?? 0.0,
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

  void selectCustomer(Customer customer) {
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
    return selectedCustomer != null &&
        (totalCylinders > 0 || totalOtherDeliveryCount > 0 || totalEmpties > 0) &&
        paymentMethod.isNotEmpty;
  }

  String _generateTicketId() {
    _orderCounter++;
    return 'DT-${88490 + _orderCounter}';
  }

  Future<bool> completeDelivery() async {
    if (!canSubmitDelivery) return false;

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

    orders.insert(
      0,
      DeliveryOrder(
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
        paymentMethod: paymentMethod,
        time: timeStr,
        stopNumber: _stopCounter,
      ),
    );

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
        );
        if (res['success'] == true) {
          lastSyncTime = DateTime.now();
          notifyListeners();
        }
      } catch (e) {
        debugPrint('Live backend sale sync error: $e');
      }
    }

    return true;
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

    // Synchronize deletion to backend to reverse StockMovement
    try {
      await ApiService.cancelSaleByTicket(order.ticketId);
    } catch (e) {
      debugPrint('Live backend order cancel error: $e');
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
      );
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
    paymentMethod = '';
    collectedAmount = 0;
    otherDeliveryQty.clear();
    _initDeliveryItems();
    notifyListeners();
  }

  // ================= DRIVER EXPENSES & BALANCE =================
  final List<DriverExpense> expenses = [];

  void addExpense({required String title, required double amount, required String paymentMethod}) {
    final now = TimeOfDay.now();
    final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
    final period = now.period == DayPeriod.am ? 'AM' : 'PM';
    final timeStr = '${hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} $period';

    expenses.insert(
      0,
      DriverExpense(
        id: 'EXP-${DateTime.now().millisecondsSinceEpoch}',
        title: title,
        amount: amount,
        paymentMethod: paymentMethod,
        time: timeStr,
      ),
    );
    notifyListeners();
  }

  void deleteExpense(String id) {
    expenses.removeWhere((e) => e.id == id);
    notifyListeners();
  }

  double get cashIncome => orders
      .where((o) => o.paymentMethod.toLowerCase() == 'cash')
      .fold(0.0, (sum, o) => sum + o.amount);

  double get upiIncome => orders
      .where((o) => o.paymentMethod.toLowerCase().contains('upi') || o.paymentMethod.toLowerCase().contains('bank'))
      .fold(0.0, (sum, o) => sum + o.amount);

  double get totalIncome => cashIncome + upiIncome;

  double get cashExpense => expenses
      .where((e) => e.paymentMethod.toLowerCase() == 'cash')
      .fold(0.0, (sum, e) => sum + e.amount);

  double get upiExpense => expenses
      .where((e) => e.paymentMethod.toLowerCase().contains('upi') || e.paymentMethod.toLowerCase().contains('bank'))
      .fold(0.0, (sum, e) => sum + e.amount);

  double get totalExpense => cashExpense + upiExpense;

  double get cashBalance => cashIncome - cashExpense;
  double get upiBalance => upiIncome - upiExpense;
  double get netBalance => totalIncome - totalExpense;

  // Aliases for Bank
  double get bankIncome => upiIncome;
  double get bankExpense => upiExpense;
  double get bankBalance => upiBalance;

  // ================= ADMIN DEPOT STATE & ACTIONS =================
  List<AdminDriver> fleetDrivers = [
    AdminDriver(
      id: 'DRV001',
      name: 'John Driver',
      vehicle: 'KL 77 3803',
      phone: '+91 98470 23119',
      password: '1234',
      active: true,
      deliveries: 8,
      route: 'Route #4B \u2022 Bay 3 Loading',
      cylindersOnboard: 48,
      stockAllocation: {
        '33 KG': 0,
        '21 KG': 0,
        '17 KG': 40,
        '12 KG': 8,
        '4 KG': 0,
      },
      mockCashIncome: 7960,
      mockUpiIncome: 5400,
      mockExpenses: [
        DriverExpense(id: 'EXP-1', title: 'Fuel Topup (Diesel)', amount: 450, paymentMethod: 'Cash', time: '09:40 AM'),
        DriverExpense(id: 'EXP-2', title: 'Toll Plaza Pass', amount: 130, paymentMethod: 'UPI', time: '11:15 AM'),
      ],
    ),
    AdminDriver(
      id: 'DRV002',
      name: 'Rahul Kumar',
      vehicle: 'KL 22 5501',
      phone: '+91 98470 55201',
      password: '1234',
      active: true,
      deliveries: 6,
      route: 'Route #2A \u2022 Bay 1 West',
      cylindersOnboard: 50,
      mockCashIncome: 8400,
      mockUpiIncome: 6200,
      mockExpenses: [
        DriverExpense(id: 'EXP-3', title: 'Fuel Refill', amount: 1200, paymentMethod: 'Cash', time: '08:30 AM'),
        DriverExpense(id: 'EXP-4', title: 'Highway Toll', amount: 180, paymentMethod: 'UPI', time: '10:45 AM'),
        DriverExpense(id: 'EXP-5', title: 'Driver Lunch Allowance', amount: 150, paymentMethod: 'Cash', time: '01:30 PM'),
      ],
    ),
    AdminDriver(
      id: 'DRV003',
      name: 'Suresh Nair',
      vehicle: 'KL 11 2233',
      phone: '+91 94960 12345',
      password: '1234',
      active: true,
      deliveries: 5,
      route: 'Route #5C \u2022 Bay 4 North',
      cylindersOnboard: 50,
      mockCashIncome: 6100,
      mockUpiIncome: 4800,
      mockExpenses: [
        DriverExpense(id: 'EXP-6', title: 'Fuel Topup', amount: 950, paymentMethod: 'Cash', time: '09:00 AM'),
        DriverExpense(id: 'EXP-7', title: 'Depot Parking Fee', amount: 120, paymentMethod: 'Cash', time: '02:15 PM'),
      ],
    ),
    AdminDriver(
      id: 'DRV004',
      name: 'Anil Menon',
      vehicle: 'KL 33 4455',
      phone: '+91 98765 43213',
      password: '1234',
      active: false,
      deliveries: 0,
      route: 'Depot Standby / Fleet Reserve',
      cylindersOnboard: 0,
      mockCashIncome: 0,
      mockUpiIncome: 0,
      mockExpenses: [],
    ),
    AdminDriver(
      id: 'DRV005',
      name: 'Pradeep Varma',
      vehicle: 'KL 55 6677',
      phone: '+91 98765 43214',
      password: '1234',
      active: true,
      deliveries: 4,
      route: 'Route #1D \u2022 Bay 2 South',
      cylindersOnboard: 50,
      mockCashIncome: 5300,
      mockUpiIncome: 3900,
      mockExpenses: [
        DriverExpense(id: 'EXP-8', title: 'Toll Gate', amount: 240, paymentMethod: 'UPI', time: '10:00 AM'),
        DriverExpense(id: 'EXP-9', title: 'Truck Maintenance & Air', amount: 200, paymentMethod: 'Cash', time: '03:00 PM'),
      ],
    ),
  ];

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

  // Depot wide total revenue calculations
  double get adminTotalRevenueToday {
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverTotalIncome(d));
  }

  double get adminTotalCashToday {
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverCashIncome(d));
  }

  double get adminTotalUpiToday {
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverUpiIncome(d));
  }

  double get adminTotalExpensesToday {
    return fleetDrivers.where((d) => d.active).fold(0.0, (sum, d) => sum + getDriverTotalExpense(d));
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

  List<WarehouseItem> warehouseItems = [
    WarehouseItem(weight: '17 KG', title: '17 KG Cylinder', filledStock: 200, emptyStock: 40, price: 1420),
    WarehouseItem(weight: '21 KG', title: '21 KG Cylinder', filledStock: 100, emptyStock: 20, price: 1850),
    WarehouseItem(weight: '33 KG', title: '33 KG Cylinder', filledStock: 50, emptyStock: 10, price: 2650),
    WarehouseItem(weight: '12 KG', title: '12 KG Cylinder', filledStock: 150, emptyStock: 30, price: 980),
    WarehouseItem(weight: '4 KG', title: '4 KG Cylinder', filledStock: 100, emptyStock: 20, price: 450),
  ];

  int get totalWarehouseFilled => warehouseItems.fold(0, (sum, i) => sum + i.filledStock);
  int get totalWarehouseEmpty => warehouseItems.fold(0, (sum, i) => sum + i.emptyStock);
  int get totalActiveDrivers => fleetDrivers.where((d) => d.active).length;

  void reloadTruckStock(String weight, int qty) {
    final wh = warehouseItems.firstWhere((w) => w.weight == weight, orElse: () => warehouseItems[0]);
    final truckCyl = cylinders.firstWhere((c) => c.weight == weight, orElse: () => cylinders[0]);

    if (wh.filledStock >= qty) {
      wh.filledStock -= qty;
      truckCyl.filledStock += qty;
      fleetDrivers[0].cylindersOnboard = truckStock;
      notifyListeners();
    }
  }

  void addWarehouseRefill(String weight, int qty) {
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
