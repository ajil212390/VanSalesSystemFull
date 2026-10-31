import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Default to computer's Wi-Fi LAN IP so connected phones can reach backend
  static String baseUrl = 'http://192.168.1.33:8000/api/v1';

  static const String _tokenKey = 'auth_token';
  static const String _userKey = 'auth_user';
  static const String _customUrlKey = 'custom_base_url';

  /// Initialize custom base URL if configured by user
  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUrl = prefs.getString(_customUrlKey);
    if (savedUrl != null && savedUrl.isNotEmpty) {
      baseUrl = savedUrl;
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
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  /// 1. Driver / Admin Login: POST /auth/login/
  static Future<Map<String, dynamic>> login(String username, String password) async {
    final uri = Uri.parse('$baseUrl/auth/login/');
    final res = await http.post(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'username': username.trim(),
        'password': password.trim(),
      }),
    );

    final data = jsonDecode(res.body);

    if (res.statusCode == 200) {
      final token = data['access'] as String?;
      final user = data['user'] as Map<String, dynamic>?;

      if (token != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenKey, token);
        if (user != null) {
          await prefs.setString(_userKey, jsonEncode(user));
        }
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
  }

  /// Logout and clear saved preferences
  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
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
      final curRes = await http.get(currentUri, headers: headers);
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
      final res = await http.get(uri, headers: headers);

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
        final fallbackRes = await http.get(fallbackUri, headers: headers);
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
    final uri = Uri.parse('$baseUrl/delivery-notes/van-stock/?allocation_id=$allocationId');
    final res = await http.get(uri, headers: await _headers());

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) {
        return List<Map<String, dynamic>>.from(data);
      }
    }
    return [];
  }

  /// 4. Fetch Products & Prices: GET /products/
  static Future<List<Map<String, dynamic>>> getProducts() async {
    final uri = Uri.parse('$baseUrl/products/');
    final res = await http.get(uri, headers: await _headers());

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final list = data is List ? data : (data['results'] as List? ?? []);
      return List<Map<String, dynamic>>.from(list);
    }
    return [];
  }

  /// 5. Fetch Customers List: GET /ledgers/?AccountType=CUSTOMER
  static Future<List<Map<String, dynamic>>> getCustomers() async {
    final uri = Uri.parse('$baseUrl/ledgers/?AccountType=CUSTOMER');
    final res = await http.get(uri, headers: await _headers());

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final list = data is List ? data : (data['results'] as List? ?? []);
      return List<Map<String, dynamic>>.from(list);
    }
    return [];
  }

  /// 6. Create a delivery sale: POST /delivery-notes/create_sale/
  static Future<Map<String, dynamic>> createSale({
    required int allocationId,
    required int customerLedgerId,
    required List<Map<String, dynamic>> items,
    required String paymentMethod,
    required double amountCollected,
  }) async {
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
      }),
    );
    try {
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {'success': false, 'message': 'Server error ${res.statusCode}'};
    }
  }

  /// 7. Get driver sales for today: GET /delivery-notes/driver_sales/?allocation_id=X
  static Future<List<Map<String, dynamic>>> getDriverSales(int allocationId) async {
    final uri = Uri.parse('$baseUrl/delivery-notes/driver_sales/?allocation_id=$allocationId');
    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      if (data is List) return List<Map<String, dynamic>>.from(data);
      if (data is Map && data.containsKey('results')) {
        return List<Map<String, dynamic>>.from(data['results']);
      }
    }
    return [];
  }

  /// 8. Cancel a delivery: POST /delivery-notes/cancel_sale/
  static Future<bool> cancelSaleByTicket(String ticketId) async {
    final uri = Uri.parse('$baseUrl/delivery-notes/cancel_sale/');
    final res = await http.post(
      uri,
      headers: await _headers(),
      body: jsonEncode({'ticket_id': ticketId}),
    );
    return res.statusCode == 200 || res.statusCode == 204;
  }

  static Future<bool> cancelSale(int deliveryNoteId) async {
    final uri = Uri.parse('$baseUrl/delivery-notes/$deliveryNoteId/cancel/');
    final res = await http.delete(uri, headers: await _headers());
    return res.statusCode == 200 || res.statusCode == 204;
  }

  /// 9. End shift: POST /delivery-notes/end_shift/
  static Future<Map<String, dynamic>> endShift({
    required int allocationId,
    required List<Map<String, dynamic>> remainingCylinders,
    required List<Map<String, dynamic>> remainingOther,
    required double totalCollected,
    required int totalDeliveries,
  }) async {
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
      }),
    );
    try {
      return jsonDecode(res.body) as Map<String, dynamic>;
    } catch (_) {
      return {'success': false, 'message': 'Server error ${res.statusCode}'};
    }
  }

  /// 10. Get last sync time: GET /delivery-notes/last_sync/?allocation_id=X
  static Future<DateTime?> getLastSync(int allocationId) async {
    final uri = Uri.parse('$baseUrl/delivery-notes/last_sync/?allocation_id=$allocationId');
    final res = await http.get(uri, headers: await _headers());
    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final ts = data['last_updated'] as String?;
      if (ts != null) return DateTime.tryParse(ts);
    }
    return null;
  }
}
