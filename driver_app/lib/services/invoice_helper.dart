import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import 'api_service.dart';
import '../widgets/app_toast.dart';

class InvoiceHelper {
  static const MethodChannel _nativeChannel = MethodChannel('com.supergas.driver/whatsapp');

  /// Cleans and formats phone number to standard international format (e.g. 919876543210)
  static String cleanPhoneNumber(String phone) {
    String digits = phone.replaceAll(RegExp(r'\D'), '');
    if (digits.length == 10) {
      return '91$digits';
    } else if (digits.length == 11 && digits.startsWith('0')) {
      return '91${digits.substring(1)}';
    } else if (digits.length == 12 && digits.startsWith('91')) {
      return digits;
    }
    return digits;
  }

  /// Constructs the direct PDF download URL for an invoice ticket (with timestamp cache-buster)
  static String getPdfUrl(String ticketId, {int? salesId}) {
    final cleanBase = ApiService.baseUrl.replaceAll(RegExp(r'/+$'), '');
    final uriBuffer = StringBuffer('$cleanBase/sales/invoice-pdf/?');
    if (salesId != null && salesId > 0) {
      uriBuffer.write('sales_id=$salesId&');
    }
    uriBuffer.write('ticket_id=${Uri.encodeComponent(ticketId)}');
    uriBuffer.write('&_t=${DateTime.now().millisecondsSinceEpoch}');
    return uriBuffer.toString();
  }

  /// Deletes any cached local PDF copy so the newly regenerated invoice is always fetched
  static Future<void> invalidateCachedPdf(String ticketId) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final safeTicket = ticketId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
      final file = File('${tempDir.path}/Tax_Invoice_$safeTicket.pdf');
      if (await file.exists()) {
        await file.delete();
      }
    } catch (_) {}
  }

  /// Opens the official GST Tax Invoice PDF in the system PDF viewer or browser
  static Future<void> openPdf(BuildContext context, String ticketId, {int? salesId}) async {
    final pdfUrl = getPdfUrl(ticketId, salesId: salesId);
    final uri = Uri.parse(pdfUrl);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        await launchUrl(uri);
      }
    } catch (e) {
      if (context.mounted) {
        AppToast.error(context, 'Could not open invoice PDF: $e');
      }
    }
  }

  /// Downloads the official GST Tax Invoice PDF to local storage and returns the File
  static Future<File?> downloadInvoicePdf(String ticketId, {int? salesId}) async {
    try {
      final pdfUrl = getPdfUrl(ticketId, salesId: salesId);
      final response = await http.get(Uri.parse(pdfUrl)).timeout(const Duration(seconds: 15));

      if (response.statusCode == 200 && response.bodyBytes.isNotEmpty) {
        final tempDir = await getTemporaryDirectory();
        final safeTicket = ticketId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
        final filename = 'Tax_Invoice_$safeTicket.pdf';
        final file = File('${tempDir.path}/$filename');
        await file.writeAsBytes(response.bodyBytes);
        return file;
      } else {
        debugPrint('downloadInvoicePdf: Status ${response.statusCode} for $ticketId');
      }
    } catch (e) {
      debugPrint('downloadInvoicePdf error for $ticketId: $e');
    }
    return null;
  }

  /// Formats a clean, minimal caption for the shared PDF document (no verbose essay text)
  static String formatWhatsAppDeliveryMessage({
    required String customerName,
    required String ticketId,
    required int totalDelivered,
    required int totalEmpties,
    required double totalBill,
    required double collectedAmount,
    required String paymentMethod,
    String? driverName,
    String? dateStr,
  }) {
    // Case 1A: Pure Empty Return
    if (ticketId.startsWith('EMTRTN-') ||
        (totalDelivered == 0 && totalEmpties > 0 && (collectedAmount <= 0.01 || paymentMethod.toUpperCase() == 'N/A'))) {
      return 'Future Gas - Empty Cylinder Return Voucher #$ticketId for $customerName';
    }

    // Case 1B: Customer Payment Receipt (pure on-account receipt)
    final isMoneyReceipt = ticketId.startsWith('RCPT-') ||
        ticketId.startsWith('TREC-') ||
        ticketId.startsWith('REC-') ||
        (totalDelivered == 0 && collectedAmount > 0.01);

    if (isMoneyReceipt) {
      final paidStr = collectedAmount.toStringAsFixed(2);
      return 'Future Gas - Official Payment Receipt #$ticketId (₹$paidStr) for $customerName';
    }

    // Case 2: Standard or Credit Tax Invoice
    return 'Future Gas - Tax Invoice #$ticketId for $customerName';
  }

  /// Directly sends the downloaded PDF invoice to the customer's WhatsApp chat
  static Future<bool> shareDirectToWhatsApp({
    required BuildContext context,
    required File pdfFile,
    required String ticketId,
    required String customerName,
    String? customerPhone,
    String? customMessage,
  }) async {
    final phone = (customerPhone != null && customerPhone.trim().isNotEmpty)
        ? cleanPhoneNumber(customerPhone)
        : '';
    final message = customMessage ?? 'Future Gas - GST Tax Invoice for $customerName (Invoice #$ticketId)';

    bool directSuccess = false;
    try {
      final res = await _nativeChannel.invokeMethod<bool>('shareFileToWhatsApp', {
        'phone': phone,
        'filePath': pdfFile.path,
        'text': message,
      });
      directSuccess = (res == true);
    } catch (e) {
      debugPrint('Native WhatsApp share attempt failed: $e');
    }

    // Fallback to system share sheet if direct WhatsApp intent wasn't available
    if (!directSuccess) {
      if (!context.mounted) return false;
      return await shareDownloadedPdf(
        context: context,
        pdfFile: pdfFile,
        ticketId: ticketId,
        customerName: customerName,
        customerPhone: customerPhone,
        customMessage: customMessage,
      );
    }
    return true;
  }

  /// Instantly shares an already downloaded PDF file to WhatsApp / messaging apps
  static Future<bool> shareDownloadedPdf({
    required BuildContext context,
    required File pdfFile,
    required String ticketId,
    required String customerName,
    String? customerPhone,
    String? customMessage,
  }) async {
    try {
      final safeTicket = ticketId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
      final filename = 'Tax_Invoice_$safeTicket.pdf';
      final xFile = XFile(
        pdfFile.path,
        mimeType: 'application/pdf',
        name: filename,
      );

      final shareText = customMessage ?? 'Future Gas - GST Tax Invoice for $customerName (Invoice #$ticketId)';

      final result = await SharePlus.instance.share(
        ShareParams(
          files: [xFile],
          text: shareText,
          subject: 'Tax Invoice #$ticketId',
        ),
      );
      return result.status != ShareResultStatus.unavailable;
    } catch (e) {
      if (context.mounted) {
        AppToast.error(context, 'Could not share PDF invoice: $e');
      }
      return false;
    }
  }

  /// Downloads the official GST Tax Invoice PDF and shares the actual PDF file
  /// directly to WhatsApp / recipient apps.
  static Future<bool> sharePdfToWhatsApp({
    required BuildContext context,
    required String ticketId,
    required String customerName,
    String? customerPhone,
    File? preloadedFile,
    int? salesId,
    String? customMessage,
  }) async {
    try {
      File? file = preloadedFile;
      if (file == null || !await file.exists()) {
        file = await downloadInvoicePdf(ticketId, salesId: salesId);
      }

      if (file != null && await file.exists()) {
        if (!context.mounted) return false;
        return await shareDirectToWhatsApp(
          context: context,
          pdfFile: file,
          ticketId: ticketId,
          customerName: customerName,
          customerPhone: customerPhone,
          customMessage: customMessage,
        );
      } else {
        throw Exception('Could not fetch invoice PDF from server');
      }
    } catch (e) {
      if (context.mounted) {
        AppToast.error(context, 'Could not share PDF invoice: $e');
      }
      return false;
    }
  }
}
