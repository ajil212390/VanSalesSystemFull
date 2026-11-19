import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Production API domain for Royal Agencies VPS deployment
  static String baseUrl = 'https://api.royalagencies.online/api/v1';

  static const String _tokenKey = 'auth_token';
  static const String _refreshTokenKey = 'auth_refresh_token';
  static const String _userKey = 'auth_user';
  static const String _customUrlKey = 'custom_base_url';

  static const Duration requestTimeout = Duration(seconds: 10);

  /// Initialize custom base URL if configured by user
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_customUrlKey);
    if (savedUrl != null && savedUrl.isNotEmpty) {
      if (savedUrl.contains('192.168.') || savedUrl.contains('devtunnels.ms') || savedUrl.contains('//api/v1')) {
        // Automatically migrate stale development URLs to production
        baseUrl = 'https://api.royalagencies.online/api/v1';
        await prefs.setString(_customUrlKey, baseUrl);
      } else {
        baseUrl = savedUrl.replaceAll(RegExp(r'/+$'), '');
      }
    }
  }

  /// Change backend server URL dynamically (for physical testing over WiFi)
  static Future<void> setBaseUrl(String newUrl) async {
    baseUrl = newUrl.trim().replaceAll(RegExp(r'/+$'), '');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_customUrlKey, baseUrl);
  }

  /// Retrieve stored JWT access token
  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  /// Retrieve stored JWT refresh token
  static Future<String?> getRefreshToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_refreshTokenKey);
  }

  /// Refresh JWT access token automatically
  static Future<bool> refreshAccessToken() async {
    final refreshToken = await getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) return false;

    try {
      final uri = Uri.parse('$baseUrl/auth/refresh/');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh': refreshToken}),
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final newAccess = data['access'] as String?;
        if (newAccess != null && newAccess.isNotEmpty) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_tokenKey, newAccess);
          final newRefresh = data['refresh'] as String?;
          if (newRefresh != null && newRefresh.isNotEmpty) {
            await prefs.setString(_refreshTokenKey, newRefresh);
          }
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  /// Retrieve stored User session
  static Future<Map<String, dynamic>?> getSavedUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  /// Standard Headers with Authorization
  static Future<Map<String, String>> _headers() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
    };
  }

  /// 1. Driver / Admin Login: POST /auth/login/
  static Future<Map<String, dynamic>> login(String username, String password) async {
    try {
      final uri = Uri.parse('$baseUrl/auth/login/');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username.trim(),
          'password': password.trim(),
        }),
      ).timeout(requestTimeout);

      final data = jsonDecode(res.body);

      if (res.statusCode == 200) {
        final token = data['access'] as String?;
        final refreshToken = data['refresh'] as String?;
        final user = data['user'] as Map<String, dynamic>?;

        final prefs = await SharedPreferences.getInstance();
        if (token != null) {
          await prefs.setString(_tokenKey, token);
        }
        if (refreshToken != null) {
          await prefs.setString(_refreshTokenKey, refreshToken);
        }
        if (user != null) {
          await prefs.setString(_userKey, jsonEncode(user));
        }
        return {'success': true, 'data': data};
      } else {
        String errorMsg = 'Invalid credentials';
        if (data is Map && data.containsKey('non_field_errors')) {
          final nfe = data['non_field_errors'];
          errorMsg = nfe is List ? nfe.join(', ') : nfe.toString();
        } else if (data is Map && data.containsKey('detail')) {
          errorMsg = data['detail'].toString();
        }
        return {'success': false, 'message': errorMsg};
      }
    } catch (e) {
      return {'success': false, 'message': 'Network connection error or timeout. Please check server.'};
    }
  }

  /// Logout and clear saved preferences
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_refreshTokenKey);
    await prefs.remove(_userKey);
  }

  /// 2. Fetch Driver's Active Allocation: GET /allocations/current/ or /allocations/?DriverId=...
  static Future<Map<String, dynamic>?> getDriverAllocation([int? driverId]) async {
    final headers = await _headers();

    // 1. Try dedicated current allocation endpoint
    try {
      final currentUri = Uri.parse(
        driverId != null && driverId > 0
            ? '$baseUrl/allocations/current/?DriverId=$driverId'
            : '$baseUrl/allocations/current/',
      );
      final curRes = await http.get(currentUri, headers: headers).timeout(requestTimeout);
      if (curRes.statusCode == 200 && curRes.body.isNotEmpty && curRes.body != 'null') {
        final curData = jsonDecode(curRes.body);
        if (curData is Map<String, dynamic> && curData.isNotEmpty && curData.containsKey('RouteVehicleDriverId')) {
          return curData;
        }
      }
    } catch (_) {}

    // 2. Query list /allocations/?DriverId=...&IsActive=true
    try {
      final query = driverId != null && driverId > 0
          ? 'DriverId=$driverId&IsActive=true'
          : 'IsActive=true';
      final uri = Uri.parse('$baseUrl/allocations/?$query');
      final res = await http.get(uri, headers: headers).timeout(requestTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        if (list.isNotEmpty) {
          return list.first as Map<String, dynamic>;
        }
      }
    } catch (_) {}

    // 3. Fallback without IsActive=true
    if (driverId != null && driverId > 0) {
      try {
        final fallbackUri = Uri.parse('$baseUrl/allocations/?DriverId=$driverId');
        final fallbackRes = await http.get(fallbackUri, headers: headers).timeout(requestTimeout);
        if (fallbackRes.statusCode == 200) {
          final data = jsonDecode(fallbackRes.body);
          final list = data is List ? data : (data['results'] as List? ?? []);
          if (list.isNotEmpty) {
            return list.first as Map<String, dynamic>;
          }
        }
      } catch (_) {}
    }
    return null;
  }

  /// 3. Fetch Real-time Onboard Stock for the Van: GET /delivery-notes/van-stock/?allocation_id=...
  static Future<List<Map<String, dynamic>>> getVanStock(int allocationId) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/van-stock/?allocation_id=$allocationId');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
      }
    } catch (_) {}
    return [];
  }

  /// 4. Fetch Products & Prices: GET /products/
  static Future<List<Map<String, dynamic>>> getProducts() async {
    try {
      final uri = Uri.parse('$baseUrl/products/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }

  /// 5. Fetch Customers List: GET /ledgers/customers/ (Sundry Debtors)
  static Future<List<Map<String, dynamic>>> getCustomers() async {
    // 1. Primary: dedicated /ledgers/customers/ endpoint
    try {
      final uri = Uri.parse('$baseUrl/ledgers/customers/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        if (list.isNotEmpty) {
          return List<Map<String, dynamic>>.from(list);
        }
      }
    } catch (_) {}

    // 2. Fallback: standard /ledgers/?AccountType=CUSTOMER&page_size=200
    try {
      final uri = Uri.parse('$baseUrl/ledgers/?AccountType=CUSTOMER&page_size=200');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        if (list.isNotEmpty) {
          return List<Map<String, dynamic>>.from(list);
        }
      }
    } catch (_) {}
    return [];
  }

  /// 6. Create a delivery sale: POST /delivery-notes/create_sale/
  static Future<Map<String, dynamic>> createSale({
    required int allocationId,
    required int customerLedgerId,
    required List<Map<String, dynamic>> items,
    required String paymentMethod,
    required double amountCollected,
    double? cashAmount,
    double? upiAmount,
    String? ticketId,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/create_sale/');
      final res = await http.post(
        uri,
        headers: await _headers(),
        body: jsonEncode({
          'allocation_id': allocationId,
          'customer_ledger_id': customerLedgerId,
          'items': items,
          'payment_method': paymentMethod,
          'amount_collected': amountCollected,
          // ignore: use_null_aware_elements
          if (cashAmount != null) 'cash_amount': cashAmount,
          // ignore: use_null_aware_elements
          if (upiAmount != null) 'upi_amount': upiAmount,
          if (ticketId != null && ticketId.isNotEmpty) 'ticket_id': ticketId,
        }),
      ).timeout(requestTimeout);
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {'success': false, 'message': 'Network error or timeout'};
    }
  }

  /// Fetch active connection packages for new installations
  static Future<List<Map<String, dynamic>>> getConnectionPackages() async {
    try {
      final uri = Uri.parse('$baseUrl/connection-packages/?is_active=true');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is List) return List<Map<String, dynamic>>.from(data);
        if (data is Map && data.containsKey('results')) {
          return List<Map<String, dynamic>>.from(data['results']);
        }
      }
      return [];
    } catch (_) {
      return [];
    }
  }

  /// 7. Get driver sales for today: GET /delivery-notes/driver_sales/?allocation_id=X
  static Future<List<Map<String, dynamic>>> getDriverSales(int allocationId) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/driver_sales/?allocation_id=$allocationId');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is List) return List<Map<String, dynamic>>.from(data);
        if (data is Map && data.containsKey('results')) {
          return List<Map<String, dynamic>>.from(data['results']);
        }
      }
    } catch (_) {}
    return [];
  }

  /// 8. Cancel a delivery: POST /delivery-notes/cancel_sale/
  static Future<bool> cancelSaleByTicket(String ticketId, {int? salesId}) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/cancel_sale/');
      final res = await http.post(
        uri,
        headers: await _headers(),
        body: jsonEncode({
          'ticket_id': ticketId,
          if (salesId != null && salesId > 0) 'sales_id': salesId,
        }),
      ).timeout(requestTimeout);
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  /// 8b. Update a delivery sale: POST /delivery-notes/update_sale/
  static Future<Map<String, dynamic>> updateSale({
    required String ticketId,
    required double amountCollected,
    int? salesId,
    String? paymentMethod,
    double? cashAmount,
    double? upiAmount,
    List<Map<String, dynamic>>? items,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/update_sale/');
      final payload = {
        'ticket_id': ticketId,
        ...?salesId != null ? {'sales_id': salesId} : null,
        'amount_collected': amountCollected,
        ...?paymentMethod != null ? {'payment_method': paymentMethod} : null,
        ...?cashAmount != null ? {'cash_amount': cashAmount} : null,
        ...?upiAmount != null ? {'upi_amount': upiAmount} : null,
        ...?items != null ? {'items': items} : null,
      };
      final res = await http.post(
        uri,
        headers: await _headers(),
        body: jsonEncode(payload),
      ).timeout(requestTimeout);
      final decoded = jsonDecode(res.body);
      if (decoded is Map<String, dynamic>) {
        return decoded;
      }
      return {'success': res.statusCode >= 200 && res.statusCode < 300};
    } catch (e) {
      debugPrint('updateSale API error: $e');
      return {'success': false, 'message': 'Network error or timeout: $e'};
    }
  }

  static Future<bool> cancelSale(int deliveryNoteId) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/$deliveryNoteId/cancel/');
      final res = await http.delete(uri, headers: await _headers()).timeout(requestTimeout);
      return res.statusCode == 200 || res.statusCode == 204;
    } catch (_) {
      return false;
    }
  }

  /// 9. End shift: POST /delivery-notes/end_shift/
  static Future<Map<String, dynamic>> endShift({
    required int allocationId,
    required List<Map<String, dynamic>> remainingCylinders,
    required List<Map<String, dynamic>> remainingOther,
    required double totalCollected,
    required int totalDeliveries,
    double cashCollected = 0.0,
    double bankCollected = 0.0,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/end_shift/');
      final res = await http.post(
        uri,
        headers: await _headers(),
        body: jsonEncode({
          'allocation_id': allocationId,
          'remaining_cylinders': remainingCylinders,
          'remaining_other': remainingOther,
          'total_collected': totalCollected,
          'total_deliveries': totalDeliveries,
          'cash_balance': cashCollected,
          'bank_balance': bankCollected,
          'cash_collected': cashCollected,
          'bank_collected': bankCollected,
        }),
      ).timeout(requestTimeout);
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {'success': false, 'message': 'Network error or timeout submitting end shift'};
    }
  }

  /// Get shift status: GET /end-route-drivers/shift_status/?allocation_id=X
  static Future<Map<String, dynamic>?> getShiftStatus(int allocationId) async {
    try {
      final uri = Uri.parse('$baseUrl/end-route-drivers/shift_status/?allocation_id=$allocationId');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  /// 10. Get last sync time: GET /delivery-notes/last_sync/?allocation_id=X
  static Future<DateTime?> getLastSync(int allocationId) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/last_sync/?allocation_id=$allocationId');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final ts = data['last_updated'] as String?;
        if (ts != null) return DateTime.tryParse(ts);
      }
    } catch (_) {}
    return null;
  }

  /// 11. Fetch driver trip expenses: GET /delivery-notes/driver_expenses/?allocation_id=X
  static Future<List<Map<String, dynamic>>> getDriverExpenses(int allocationId) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/driver_expenses/?allocation_id=$allocationId');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is List) return List<Map<String, dynamic>>.from(data);
      }
    } catch (_) {}
    return [];
  }

  /// 12. Create driver trip expense: POST /delivery-notes/create_expense/
  static Future<Map<String, dynamic>> createDriverExpense({
    required int allocationId,
    required String category,
    required double amount,
    required String paymentMethod,
    String? notes,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/create_expense/');
      final res = await http.post(
        uri,
        headers: await _headers(),
        body: jsonEncode({
          'allocation_id': allocationId,
          'category': category,
          'amount': amount,
          'payment_method': paymentMethod,
          'notes': notes ?? '',
        }),
      ).timeout(requestTimeout);
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {'success': false, 'message': 'Network error or timeout'};
    }
  }

  /// 13. Delete driver trip expense: POST /delivery-notes/delete_expense/
  static Future<bool> deleteDriverExpense(dynamic expenseId) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/delete_expense/');
      final res = await http.post(
        uri,
        headers: await _headers(),
        body: jsonEncode({'expense_id': expenseId}),
      ).timeout(requestTimeout);
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ================= ADMIN / MANAGER LIVE DATA ENDPOINTS =================

  /// 14. Stock Analysis (Live Godowns, Vans & System Inventory): GET /delivery-notes/stock-analysis/
  static Future<Map<String, dynamic>?> getStockAnalysis() async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/stock-analysis/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        return jsonDecode(res.body) as Map<String, dynamic>;
      }
    } catch (_) {}
    return null;
  }

  /// 15. Vehicles List: GET /vehicles/
  static Future<List<Map<String, dynamic>>> getVehicles() async {
    try {
      final uri = Uri.parse('$baseUrl/vehicles/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }

  /// 16. Drivers List: GET /drivers/
  static Future<List<Map<String, dynamic>>> getDrivers() async {
    try {
      final uri = Uri.parse('$baseUrl/drivers/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }

  /// 17. Routes List: GET /routes/
  static Future<List<Map<String, dynamic>>> getRoutes() async {
    try {
      final uri = Uri.parse('$baseUrl/routes/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }

  /// 18. Allocations List: GET /allocations/
  static Future<List<Map<String, dynamic>>> getAllocations() async {
    try {
      final uri = Uri.parse('$baseUrl/allocations/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }

  /// 19. Godowns List: GET /godowns/
  static Future<List<Map<String, dynamic>>> getGodowns() async {
    try {
      final uri = Uri.parse('$baseUrl/godowns/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }

  /// 20. Live Stock in a specific Godown: GET /delivery-notes/godown-stock/?godown_id=X
  static Future<List<Map<String, dynamic>>> getGodownStock([int godownId = 1]) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/godown-stock/?godown_id=$godownId');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data is List) return List<Map<String, dynamic>>.from(data);
      }
    } catch (_) {}
    return [];
  }

  /// 21. Delivery Notes List (Van Stock Loads): GET /delivery-notes/
  static Future<List<Map<String, dynamic>>> getDeliveryNotes() async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }

  /// 22. Create Delivery Note (Transfer Stock from Godown to Van): POST /delivery-notes/
  static Future<Map<String, dynamic>> createDeliveryNote({
    required int allocationId,
    int godownId = 1,
    required List<Map<String, dynamic>> lines,
    String? remarks,
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/delivery-notes/');
      final res = await http.post(
        uri,
        headers: await _headers(),
        body: jsonEncode({
          'RouteVehicleDriver': allocationId,
          'GodownId': godownId,
          'lines': lines,
          'Remarks': remarks ?? '',
        }),
      ).timeout(requestTimeout);
      final data = jsonDecode(res.body);
      if (res.statusCode >= 200 && res.statusCode < 300) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data['detail'] ?? data['message'] ?? (data is Map ? data.values.join(', ') : 'Failed to allocate stock'),
      };
    } catch (e) {
      return {'success': false, 'message': 'Network error creating delivery note: $e'};
    }
  }

  /// 23. Fleet Sales for Today: GET /sales/?page_size=200
  static Future<List<Map<String, dynamic>>> getFleetSales() async {
    try {
      final uri = Uri.parse('$baseUrl/sales/?page_size=200');
      final res = await http.get(uri, headers: await _headers()).timeout(requestTimeout);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['results'] as List? ?? []);
        return List<Map<String, dynamic>>.from(list);
      }
    } catch (_) {}
    return [];
  }
}
