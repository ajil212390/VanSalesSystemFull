package com.supergas.supergas_driver

import android.content.ClipData
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.supergas.driver/whatsapp"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "shareFileToWhatsApp" -> {
                    val phone = call.argument<String>("phone") ?: ""
                    val filePath = call.argument<String>("filePath") ?: ""
                    val text = call.argument<String>("text") ?: ""

                    try {
                        val file = File(filePath)
                        if (!file.exists()) {
                            result.error("FILE_NOT_FOUND", "File does not exist: $filePath", null)
                            return@setMethodCallHandler
                        }

                        val uri: Uri = FileProvider.getUriForFile(
                            applicationContext,
                            "${applicationContext.packageName}.fileprovider",
                            file
                        )

                        val pm = packageManager
                        val isWp = isPackageInstalled("com.whatsapp", pm)
                        val isBiz = isPackageInstalled("com.whatsapp.w4b", pm)

                        val targetPackage = when {
                            isWp -> "com.whatsapp"
                            isBiz -> "com.whatsapp.w4b"
                            else -> null
                        }

                        val cleanDigits = phone.replace(Regex("[^0-9]"), "")
                        val formattedPhone = when {
                            cleanDigits.length == 10 -> "91$cleanDigits"
                            cleanDigits.startsWith("0") && cleanDigits.length == 11 -> "91${cleanDigits.substring(1)}"
                            else -> cleanDigits
                        }
                        val jid = if (formattedPhone.isNotEmpty()) "${formattedPhone}@s.whatsapp.net" else null

                        val intent = Intent(Intent.ACTION_SEND).apply {
                            this.type = "application/pdf"
                            if (targetPackage != null) {
                                setPackage(targetPackage)
                            }
                            if (jid != null) {
                                putExtra("jid", jid)
                                putExtra("phone", formattedPhone)
                                putExtra(Intent.EXTRA_PHONE_NUMBER, formattedPhone)
                            }
                            putExtra(Intent.EXTRA_STREAM, uri)
                            putExtra(Intent.EXTRA_TEXT, text)
                            clipData = ClipData.newRawUri("Invoice PDF", uri)
                            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }

                        if (targetPackage != null) {
                            try {
                                grantUriPermission(targetPackage, uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            } catch (_: Exception) {}
                        }

                        try {
                            startActivity(intent)
                            result.success(true)
                        } catch (e: Exception) {
                            // If direct package launch fails, open system chooser
                            val chooser = Intent.createChooser(intent, "Share Tax Invoice via").apply {
                                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                            }
                            startActivity(chooser)
                            result.success(true)
                        }
                    } catch (e: Exception) {
                        result.error("ERROR", e.localizedMessage, null)
                    }
                }
                "openWhatsAppDirect" -> {
                    val phone = call.argument<String>("phone") ?: ""
                    val text = call.argument<String>("text") ?: ""
                    val cleanDigits = phone.replace(Regex("[^0-9]"), "")
                    val formattedPhone = when {
                        cleanDigits.length == 10 -> "91$cleanDigits"
                        cleanDigits.startsWith("0") && cleanDigits.length == 11 -> "91${cleanDigits.substring(1)}"
                        else -> cleanDigits
                    }

                    try {
                        val encodedText = Uri.encode(text)
                        val wpUri = Uri.parse("https://api.whatsapp.com/send?phone=$formattedPhone&text=$encodedText")
                        val intent = Intent(Intent.ACTION_VIEW, wpUri).apply {
                            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("ERROR", e.localizedMessage, null)
                    }
                }
                "isWhatsAppInstalled" -> {
                    val pm = packageManager
                    val isWp = isPackageInstalled("com.whatsapp", pm) || isPackageInstalled("com.whatsapp.w4b", pm)
                    result.success(isWp)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun isPackageInstalled(packageName: String, packageManager: PackageManager): Boolean {
        return try {
            packageManager.getPackageInfo(packageName, 0)
            true
        } catch (e: PackageManager.NameNotFoundException) {
            false
        }
    }
}
