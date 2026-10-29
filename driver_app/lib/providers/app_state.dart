import 'package:flutter/material.dart';
import '../services/api_service.dart';

/// Data models and app state management
class CylinderType {
  final int? productId;
  final String weight;
  final double price;
  int filledStock;
  int emptyStock;

  CylinderType({
    this.productId,
    required this.weight,
    required this.price,
    required this.filledStock,
    this.emptyStock = 0,
  });
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
        .map((i) => '${i.cylinder.weight} × ${i.deliveryQty}')
        .toList();
    return parts.join(', ');
  }

  String get emptiesSummary {
    final parts = items
        .where((i) => i.emptyReturnQty > 0)
        .map((i) => '${i.cylinder.weight} × ${i.emptyReturnQty}')
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
  String driverName = 'Driver';
  String fullName = 'Driver';
  String driverId = 'DRV001';
  int? currentDriverDbId;
  int? currentAllocationId;
  String vehicleNumber = 'KL 77 3803';
  String routeInfo = 'Route #4B • Bay 3 Loading';
  bool isLoadingFromBackend = false;

  // Depot Vehicle Fleet (Freshly initialized with 0 stock ready for allocation)
  List<DepotVehicle> vehicles = [
    DepotVehicle(
      plateNumber: 'KL 77 3803',
      model: 'Tata 407 Heavy Express',
      assignedDriverName: 'John Driver',
      assignedDriverId: 'DRV001',
      route: 'Route #4B • Bay 3 Loading',
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
      route: 'Route #2A • Bay 1 West',
      status: 'Ready in Depot',
    ),
    DepotVehicle(
      plateNumber: 'KL 08 CZ 9912',
      model: 'Mahindra Bolero Maxi Truck',
      assignedDriverName: 'Suresh Nair',
      assignedDriverId: 'DRV003',
      route: 'Route #5C • Bay 4 North',
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
      route: 'Route #1D • Bay 2 South',
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

  // Stock for Allocated Vehicle (KL 77 3803) - 48 Filled (40 x 17KG, 8 x 12KG)
  late List<CylinderType> cylinders = [
    CylinderType(weight: '33 KG', price: 0, filledStock: 0, emptyStock: 0),
    CylinderType(weight: '21 KG', price: 0, filledStock: 0, emptyStock: 0),
    CylinderType(weight: '17 KG', price: 0, filledStock: 40, emptyStock: 0),
    CylinderType(weight: '12 KG', price: 0, filledStock: 8, emptyStock: 0),
    CylinderType(weight: '4 KG', price: 0, filledStock: 0, emptyStock: 0),
  ];

  // Customers
  final List<Customer> customers = [
    Customer(
      name: 'Apex Bakery',
      phone: '+91 98470 23119',
      address: 'Market Road, Near Clock Tower, Calicut',
      type: 'Regular',
      creditLimit: 15000,
      outstanding: 0,
    ),
    Customer(
      name: 'Hotel Grand Palace',
      phone: '+91 98470 55201',
      address: 'Beach Road, Kozhikode',
      type: 'Premium',
      creditLimit: 50000,
      outstanding: 4200,
    ),
    Customer(
      name: 'Krishna Store',
      phone: '+91 94960 12345',
      address: 'SM Street, Calicut',
      type: 'Regular',
      creditLimit: 10000,
      outstanding: 980,
    ),
    Customer(
      name: 'Mary Joseph',
      phone: '+91 98765 43211',
      address: 'Broadway, Ernakulam',
      type: 'Regular',
      creditLimit: 10000,
      outstanding: 0,
    ),
    Customer(
      name: 'Priya Nair',
      phone: '+91 98765 43213',
      address: 'Palarivattom, Kochi',
      type: 'Regular',
      creditLimit: 8000,
      outstanding: 0,
    ),
  ];

  // Orders
  final List<DeliveryOrder> orders = [];
  int _orderCounter = 0;
  int _stopCounter = 0;

  // Current delivery state
  Customer? selectedCustomer;
  late List<DeliveryItem> deliveryItems;
  String paymentMethod = '';
  double collectedAmount = 0;

  AppState() {
    _initDeliveryItems();
  }

  void _initDeliveryItems() {
    deliveryItems = cylinders
        .map((c) => DeliveryItem(cylinder: c))
        .toList();
  }

  Future<void> syncFromBackend({int? driverIdParam}) async {
    isLoadingFromBackend = true;
    notifyListeners();

    try {
      final user = await ApiService.getSavedUser();
      final dId = driverIdParam ?? (user != null ? user['driver_id'] as int? : null);
      if (user != null) {
        driverName = user['username'] ?? driverName;
        fullName = user['username'] ?? fullName;
      }

      if (dId != null && dId > 0) {
        currentDriverDbId = dId;
        driverId = 'DRV$dId';

        final alloc = await ApiService.getDriverAllocation(dId);
        if (alloc != null) {
          currentAllocationId = alloc['RouteVehicleDriverId'];
          vehicleNumber = alloc['vehicle_number'] ?? vehicleNumber;
          routeInfo = alloc['route_name'] ?? routeInfo;

          if (currentAllocationId != null) {
            final vanStock = await ApiService.getVanStock(currentAllocationId!);
            if (vanStock.isNotEmpty) {
              cylinders = vanStock.map((s) => CylinderType(
                productId: s['ProductId'],
                weight: (s['AppProductName'] != null && s['AppProductName'].toString().trim().isNotEmpty)
                    ? s['AppProductName'].toString().trim()
                    : (s['ProductName'] ?? ''),
                price: (s['SalesPrice'] as num?)?.toDouble() ?? 0.0,
                filledStock: (s['OnboardQty'] as num?)?.toInt() ?? 0,
                emptyStock: 0,
              )).toList();
              _initDeliveryItems();
            }
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
        totalCylinders > 0 &&
        paymentMethod.isNotEmpty;
  }

  String _generateTicketId() {
    _orderCounter++;
    return 'DT-${88490 + _orderCounter}';
  }

  void completeDelivery() {
    if (!canSubmitDelivery) return;

    _stopCounter++;
    final now = TimeOfDay.now();
    final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
    final period = now.period == DayPeriod.am ? 'AM' : 'PM';
    final timeStr =
        '${hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} $period';

    final activeItems = deliveryItems
        .where((i) => i.deliveryQty > 0 || i.emptyReturnQty > 0)
        .toList();

    orders.insert(
      0,
      DeliveryOrder(
        ticketId: _generateTicketId(),
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

    // Update stock
    for (final item in deliveryItems) {
      if (item.deliveryQty > 0) {
        item.cylinder.filledStock -= item.deliveryQty;
      }
      if (item.emptyReturnQty > 0) {
        item.cylinder.emptyStock += item.emptyReturnQty;
      }
    }

    notifyListeners();
  }

  void deleteOrder(DeliveryOrder order) {
    // Restore cylinder stock
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
    notifyListeners();
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
    _initDeliveryItems();
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
      .where((o) => o.paymentMethod.toLowerCase().contains('upi'))
      .fold(0.0, (sum, o) => sum + o.amount);

  double get totalIncome => cashIncome + upiIncome;

  double get cashExpense => expenses
      .where((e) => e.paymentMethod.toLowerCase() == 'cash')
      .fold(0.0, (sum, e) => sum + e.amount);

  double get upiExpense => expenses
      .where((e) => e.paymentMethod.toLowerCase().contains('upi'))
      .fold(0.0, (sum, e) => sum + e.amount);

  double get totalExpense => cashExpense + upiExpense;

  double get cashBalance => cashIncome - cashExpense;
  double get upiBalance => upiIncome - upiExpense;
  double get netBalance => totalIncome - totalExpense;

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
      route: 'Route #4B • Bay 3 Loading',
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
      route: 'Route #2A • Bay 1 West',
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
      route: 'Route #5C • Bay 4 North',
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
      route: 'Route #1D • Bay 2 South',
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
