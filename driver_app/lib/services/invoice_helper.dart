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

  /// Constructs the direct PDF download URL for an invoice ticket
  static String getPdfUrl(String ticketId, {int? salesId}) {
    final cleanBase = ApiService.baseUrl.replaceAll(RegExp(r'/+$'), '');
    final uriBuffer = StringBuffer('$cleanBase/sales/invoice-pdf/?');
    if (salesId != null && salesId > 0) {
      uriBuffer.write('sales_id=$salesId&');
    }
    uriBuffer.write('ticket_id=${Uri.encodeComponent(ticketId)}');
    return uriBuffer.toString();
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

  /// Directly sends the downloaded PDF invoice to the customer's WhatsApp chat
  static Future<bool> shareDirectToWhatsApp({
    required BuildContext context,
    required File pdfFile,
    required String ticketId,
    required String customerName,
    String? customerPhone,
  }) async {
    final phone = (customerPhone != null && customerPhone.trim().isNotEmpty)
        ? cleanPhoneNumber(customerPhone)
        : '';
    final message = 'Future Gas - GST Tax Invoice for $customerName (Bill #$ticketId)';

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
  }) async {
    try {
      final safeTicket = ticketId.replaceAll(RegExp(r'[^a-zA-Z0-9_\-]'), '_');
      final filename = 'Tax_Invoice_$safeTicket.pdf';
      final xFile = XFile(
        pdfFile.path,
        mimeType: 'application/pdf',
        name: filename,
      );

      final shareText = 'Future Gas - GST Tax Invoice for $customerName (Bill #$ticketId)';

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
