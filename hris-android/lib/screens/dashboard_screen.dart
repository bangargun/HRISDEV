import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';
import '../models/models.dart';
import '../config/api_client.dart';
import '../config/prayer_service.dart';
import 'rating_360_screen.dart';
import 'kpi_report_screen.dart';
import 'quiz_list_screen.dart';
import 'disc_screen.dart';
import 'pusat_pengajuan_screen.dart';
import 'payroll_screen.dart';
import 'sop_screen.dart';
import 'attendance_screen.dart';
import 'training_screen.dart';
import 'information_screen.dart';
import 'angket_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _dialogShown = false;
  Timer? _countdownTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      PrayerService.init(auth.profile?.outlet ?? 'Jakarta', (prayerName) {
        _showAdzanAlarmDialog(prayerName);
      });
      
      _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (mounted) setState(() {});
      });

      _checkAppVersion();
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    PrayerService.dispose();
    super.dispose();
  }

  Future<void> _checkAppVersion() async {
    try {
      final res = await ApiClient.get('app-version');
      if (res.statusCode == 200) {
        final body = jsonDecode(res.body);
        if (body['status'] == 'success' && body['data'] != null) {
          final latest = body['data']['latest_version'].toString();
          final downloadUrl = body['data']['download_url'].toString();
          final changelog = body['data']['changelog'] ?? '';
          
          const currentVersion = '2.3';
          if (latest != currentVersion) {
            _showUpdateDialog(latest, downloadUrl, changelog);
          }
        }
      }
    } catch (e) {
      print('Gagal memeriksa pembaruan aplikasi: $e');
    }
  }

  void _showUpdateDialog(String latest, String downloadUrl, String changelog) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFF00ADB5), width: 2),
          ),
          title: const Row(
            children: [
              Icon(Icons.system_update, color: Color(0xFF00ADB5)),
              SizedBox(width: 8),
              Text(
                'UPDATE TERSEDIA',
                style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Versi terbaru ($latest) telah dirilis. Silakan unduh pembaruan untuk menjaga sinkronisasi data.',
                style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 12),
              const Text(
                'Catatan Perubahan:',
                style: TextStyle(color: Color(0xFF00ADB5), fontSize: 12, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                changelog,
                style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 11, height: 1.4),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Nanti', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00ADB5)),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: downloadUrl));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Link download berhasil disalin ke clipboard!')),
                );
                Navigator.pop(context);
              },
              child: const Text('Salin Link', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          ],
        );
      },
    );
  }

  void _showAdzanAlarmDialog(String prayerName) {
    showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: Color(0xFF00ADB5), width: 2),
          ),
          title: const Row(
            children: [
              Icon(Icons.notifications_active, color: Color(0xFF00ADB5)),
              SizedBox(width: 8),
              Text(
                'WAKTU SHOLAT',
                style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: Text(
            'Waktu Sholat $prayerName telah tiba untuk wilayah Anda.\n\nSholatlah sebentar. Kemudian lanjutkan aktivitasmu. 🙏',
            style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 13, height: 1.6),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF00ADB5)),
              onPressed: () => Navigator.pop(context),
              child: const Text('OK', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          ],
        );
      },
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_dialogShown) {
      final auth = Provider.of<AuthProvider>(context);
      
      // Check for discipline/sanction notifications first (high priority)
      final unreadDisiplin = auth.unreadNotifications.where((n) => n.type == 'disiplin').toList();
      if (unreadDisiplin.isNotEmpty) {
        _dialogShown = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _showDisciplineWarningDialog(unreadDisiplin.first, auth);
        });
        return;
      }
      
      // Check for leave status notifications next
      if (auth.unacknowledgedLeaveNotifications.isNotEmpty) {
        _dialogShown = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _showLeaveStatusDialog(auth.unacknowledgedLeaveNotifications.first, auth);
        });
        return;
      }

      // Check for quiz notifications next
      final unreadQuiz = auth.unreadNotifications.where((n) => n.type == 'quiz').toList();
      if (unreadQuiz.isNotEmpty) {
        _dialogShown = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _showQuizNotificationDialog(unreadQuiz.first, auth);
        });
        return;
      }

      final unread = auth.informations.where((info) => !info.isRead && !info.judul.startsWith('[Sapaan AI]')).toList();
      if (unread.isNotEmpty) {
        _dialogShown = true;
        WidgetsBinding.instance.addPostFrameCallback((_) {
          _showPapanMelayang(unread.first, auth);
        });
      }
    }
  }

  void _showDisciplineWarningDialog(NotificationRecord notif, AuthProvider auth) {
    const glowColor = Color(0xFFEF4444); // Merah tegas
    
    // Trigger heavy vibration multiple times for strong physical warning
    HapticFeedback.vibrate();
    Future.delayed(const Duration(milliseconds: 300), () => HapticFeedback.vibrate());
    Future.delayed(const Duration(milliseconds: 600), () => HapticFeedback.vibrate());
    Future.delayed(const Duration(milliseconds: 900), () => HapticFeedback.vibrate());

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: glowColor, width: 2.5),
          ),
          title: const Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: glowColor,
                size: 30,
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'PEMBERITAHUAN DISIPLIN',
                  style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notif.message,
                  style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 13, height: 1.5, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Sifat surat sanksi ini mengikat secara hukum internal dan tidak dapat diganggu gugat. Arsip surat lengkap dapat diakses secara permanen pada menu Surat Sanksi di Pusat Informasi.',
                  style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 11, height: 1.4),
                ),
              ],
            ),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: glowColor,
                shadowColor: glowColor.withOpacity(0.5),
                elevation: 6,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                Navigator.pop(context);
                await auth.markNotificationAsRead(notif.id);
              },
              child: const Text('Saya Mengerti & Terima', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    ).then((_) {
      setState(() {
        _dialogShown = false;
      });
    });
  }

  void _showLeaveStatusDialog(String message, AuthProvider auth) {
    final isApproved = message.contains('🟢') || message.toLowerCase().contains('setujui');
    final glowColor = isApproved ? const Color(0xFF2ECC71) : const Color(0xFFE74C3C);

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: BorderSide(color: glowColor, width: 2),
          ),
          title: Row(
            children: [
              Icon(
                isApproved ? Icons.check_circle_outline : Icons.error_outline,
                color: glowColor,
                size: 28,
              ),
              const SizedBox(width: 8),
              Text(
                isApproved ? 'Status Cuti: DISETUJUI' : 'Status Cuti: DITOLAK',
                style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          content: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              message,
              style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 13, height: 1.5),
            ),
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: glowColor,
                shadowColor: glowColor.withOpacity(0.5),
                elevation: 6,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () async {
                Navigator.pop(context);
                await auth.acknowledgeLeaveNotifications();
              },
              child: const Text('Saya Mengerti', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    ).then((_) {
      setState(() {
        _dialogShown = false;
      });
    });
  }

  void _showQuizNotificationDialog(NotificationRecord notif, AuthProvider auth) {
    const glowColor = Color(0xFFEEEEEE); // Krem

    // Trigger vibration to alert the user physically
    HapticFeedback.vibrate();
    Future.delayed(const Duration(milliseconds: 300), () => HapticFeedback.vibrate());

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: glowColor, width: 2),
          ),
          title: Row(
            children: [
              Icon(
                Icons.assignment_outlined,
                color: glowColor,
                size: 26,
              ),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'KUIS KOMPETENSI BARU',
                  style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: Container(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  notif.title,
                  style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  notif.message,
                  style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 12, height: 1.4),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Sifat kuis: Wajib diikuti. Klik tombol di bawah untuk langsung membuka daftar kuis kompetensi aktif Anda.',
                  style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 10, height: 1.4),
                ),
              ],
            ),
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: glowColor,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        Navigator.pop(context);
                        await auth.markNotificationAsRead(notif.id);
                        if (context.mounted) {
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (context) => const QuizListScreen()),
                          );
                        }
                      },
                      child: const Text('Buka Kuis', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0x1AEEEEEE)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () async {
                        Navigator.pop(context);
                        await auth.markNotificationAsRead(notif.id);
                      },
                      child: const Text('Tutup', style: TextStyle(color: Color(0x8DEEEEEE), fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            )
          ],
        );
      },
    ).then((_) {
      setState(() {
        _dialogShown = false;
      });
    });
  }

  void _showPapanMelayang(InformationRecord info, AuthProvider auth) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              const Icon(Icons.campaign, color: Color(0xFFEEEEEE), size: 28),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  info.judul,
                  style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          content: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEEEEE).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  info.kategori.toUpperCase(),
                  style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                info.isiInformasi,
                style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 13, height: 1.5),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFEEEEEE),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              onPressed: () {
                Navigator.pop(context);
                _showConfirmReadDialog(info, auth);
              },
              child: const Text('Tutup & Konfirmasi', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    ).then((_) {
      setState(() {
        _dialogShown = false;
      });
    });
  }

  void _showConfirmReadDialog(InformationRecord info, AuthProvider auth) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'Konfirmasi Membaca',
            style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
          ),
          content: const Text(
            'Apakah kamu sudah membaca dan mengerti?',
            style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 14),
          ),
          actions: [
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFEEEEEE),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () async {
                      await auth.markInformationRead(info.id, 'siap');
                      if (context.mounted) {
                        Navigator.pop(context);
                      }
                    },
                    child: const Text('Siap', style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0x1AEEEEEE)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    onPressed: () async {
                      await auth.markInformationRead(info.id, 'tanya_admin');
                      if (context.mounted) {
                        Navigator.pop(context);
                      }
                    },
                    child: const Text(
                      'Aku nanya ke admin deh',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = Provider.of<AuthProvider>(context);
    final profile = auth.profile;
    final today = auth.todayAttendance;
    final logs = auth.attendanceHistory;

    const darkBg = Color(0xFF222831); // Hitam Pekat
    const cardBg = Color(0xFF393E46); // Cokelat Tua
    const violet = Color(0xFFEEEEEE); // Krem (accent)
    const textMuted = Color(0x8DEEEEEE); // Krem muted
    const success = Color(0xFF10B981);
    const warning = Color(0xFFF59E0B);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        title: const Text('DASHBOARD UTAMA', style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
        backgroundColor: darkBg,
        elevation: 0,
        centerTitle: false,
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            child: IconButton(
              icon: const Icon(Icons.sync_rounded, color: Color(0xFF00ADB5), size: 24),
              tooltip: 'Sinkronisasi Jadwal & Kehadiran',
              onPressed: () async {
                showDialog(
                  context: context,
                  barrierDismissible: false,
                  builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5))),
                );
                try {
                  await auth.fetchProfile();
                  await auth.fetchTodayAttendance();
                  await auth.fetchTodayBreakSchedule();
                  await auth.fetchWeeklyBreakSchedules();
                  await auth.fetchAttendanceHistory();
                  if (context.mounted) {
                    Navigator.pop(context); // Tutup loading
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Sinkronisasi data jadwal & absensi berhasil!'),
                        backgroundColor: Color(0xFF10B981),
                      ),
                    );
                  }
                } catch (e) {
                  if (context.mounted) {
                    Navigator.pop(context); // Tutup loading
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Gagal sinkronisasi data. Periksa koneksi internet Anda.'),
                        backgroundColor: Colors.redAccent,
                      ),
                    );
                  }
                }
              },
            ),
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
        children: [

          // 0. Motivasi Hari Ini Card (Sapaan AI)
          _buildAiQuoteCard(auth),
          const SizedBox(height: 20),

          // 1. Welcome Card
          Container(
            padding: const EdgeInsets.all(20.0),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Color(0xFFEEEEEE).withOpacity(0.05)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Selamat Datang,', style: TextStyle(color: textMuted, fontSize: 13)),
                const SizedBox(height: 4),
                Text(
                  profile?.fullName ?? 'Karyawan',
                  style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  '${profile?.position ?? '-'} | ${profile?.department ?? '-'}',
                  style: const TextStyle(color: violet, fontSize: 13, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 12),
                Text(
                  'NIK: ${profile?.nik ?? '-'}',
                  style: const TextStyle(color: textMuted, fontSize: 12),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // 2. Today Status Card
          Container(
            padding: const EdgeInsets.all(20.0),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Color(0xFFEEEEEE).withOpacity(0.05)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Status Kehadiran Hari Ini',
                  style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Absen Masuk', style: TextStyle(color: textMuted, fontSize: 11)),
                        const SizedBox(height: 4),
                        Text(
                          today?.clockIn ?? '--:--',
                          style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Absen Keluar', style: TextStyle(color: textMuted, fontSize: 11)),
                        const SizedBox(height: 4),
                        Text(
                          today?.clockOut ?? '--:--',
                          style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Status Masuk', style: TextStyle(color: textMuted, fontSize: 11)),
                        const SizedBox(height: 4),
                        Text(
                          today?.statusIn == 'ontime'
                              ? 'Tepat Waktu'
                              : today?.statusIn == 'late'
                                  ? 'Terlambat'
                                  : 'Belum Absen',
                          style: TextStyle(
                            color: today?.statusIn == 'ontime'
                                ? success
                                : today?.statusIn == 'late'
                                    ? warning
                                    : textMuted,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(color: Color(0x1AEEEEEE), height: 1),
                const SizedBox(height: 16),
                _buildAttendanceActionButtons(context, auth, today),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Tombol Sync — Sinkronisasi data lengkap dari server
          _buildSyncButton(context, auth),
          const SizedBox(height: 20),

          // Adzan Countdown Card
          _buildPrayerCountdownCard(),
          const SizedBox(height: 20),

          // 2a. Break Schedule Card
          _buildBreakScheduleCard(context, auth, today),
          const SizedBox(height: 16),

          // 2b. Weekly Break Schedule Table
          _buildWeeklyBreakScheduleTable(context, auth),
          const SizedBox(height: 20),

          // Layanan & Performa (Gojek-Style)
          const Text(
            'Layanan & Performa',
            style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFEEEEEE).withOpacity(0.05)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.gps_fixed_outlined,
                        label: 'Kehadiran',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AttendanceScreen())),
                      ),
                    ),
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.assignment_outlined,
                        label: 'Kuis',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const QuizListScreen())),
                      ),
                    ),
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.book_outlined,
                        label: 'Pelatihan',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const TrainingScreen())),
                      ),
                    ),
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.analytics_outlined,
                        label: 'KPI',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const KpiReportScreen())),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.send_outlined,
                        label: 'Pengajuan',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PusatPengajuanScreen())),
                      ),
                    ),
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.campaign_outlined,
                        label: 'Informasi',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const InformationScreen(initialIndex: 0))),
                      ),
                    ),
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.alarm_on_outlined,
                        label: 'Sholat',
                        onTap: () => _showPrayerScheduleModal(context, auth),
                      ),
                    ),
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.menu_book_outlined,
                        label: 'SOP & Arsip',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SopScreen())),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    Expanded(
                      child: _buildGojekMenuItem(
                        icon: Icons.assignment_outlined,
                        label: 'Angket',
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AngketScreen())),
                      ),
                    ),
                    const Expanded(child: SizedBox()),
                    const Expanded(child: SizedBox()),
                    const Expanded(child: SizedBox()),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          // 3. Recent Title
          const Text(
            'Riwayat Kehadiran Terkini',
            style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),

          // Logs List
          if (logs.isEmpty) ...[
            const Center(
              child: Padding(
                padding: EdgeInsets.all(24.0),
                child: Text('Belum ada riwayat absensi.', style: TextStyle(color: textMuted, fontSize: 13)),
              ),
            )
          ] else if (ApiClient.isTabletEdition) ...[
            // Rombak untuk Tablet - Grid tabel lebar datar tanpa scroll horizontal
            Container(
              width: double.infinity,
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Color(0xFFEEEEEE).withOpacity(0.05)),
              ),
              child: DataTable(
                headingRowColor: MaterialStateProperty.all(violet.withOpacity(0.1)),
                columns: const [
                  DataColumn(label: Text('Tanggal', style: TextStyle(color: Color(0xFFEEEEEE), fontWeight: FontWeight.bold, fontSize: 12))),
                  DataColumn(label: Text('Jam Masuk', style: TextStyle(color: Color(0xFFEEEEEE), fontWeight: FontWeight.bold, fontSize: 12))),
                  DataColumn(label: Text('Jam Keluar', style: TextStyle(color: Color(0xFFEEEEEE), fontWeight: FontWeight.bold, fontSize: 12))),
                  DataColumn(label: Text('Status Masuk', style: TextStyle(color: Color(0xFFEEEEEE), fontWeight: FontWeight.bold, fontSize: 12))),
                ],
                rows: logs.take(10).map<DataRow>((log) {
                  final isOnTime = log.statusIn == 'ontime';
                  return DataRow(
                    cells: [
                      DataCell(Text(log.date, style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 12))),
                      DataCell(Text(log.clockIn ?? '--:--', style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 12))),
                      DataCell(Text(log.clockOut ?? '--:--', style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 12))),
                      DataCell(
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: isOnTime ? success.withOpacity(0.1) : warning.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            isOnTime ? 'Tepat Waktu' : 'Terlambat',
                            style: TextStyle(
                              color: isOnTime ? success : warning,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  );
                }).toList(),
              ),
            ),
          ] else ...[
            ...logs.take(5).map((log) {
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: cardBg,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Color(0xFFEEEEEE).withOpacity(0.03)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          log.date,
                          style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Masuk: ${log.clockIn ?? "--"} | Keluar: ${log.clockOut ?? "--"}',
                          style: const TextStyle(color: textMuted, fontSize: 12),
                        ),
                      ],
                    ),
                    Text(
                      log.statusIn == 'ontime' ? 'Tepat Waktu' : 'Terlambat',
                      style: TextStyle(
                        color: log.statusIn == 'ontime' ? success : warning,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              );
            }).toList()
          ]
        ],
      ),
    );
  }

  Widget _buildPrayerCountdownCard() {
    const cardBg = Color(0xFF393E46);
    const textMuted = Color(0x8DEEEEEE);
    const accentColor = Color(0xFF00ADB5);

    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEEEEEE).withOpacity(0.05)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.schedule, color: accentColor, size: 16),
                    SizedBox(width: 6),
                    Text(
                      'Jadwal Sholat Terdekat',
                      style: TextStyle(color: textMuted, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  '${PrayerService.nextPrayerName} (${PrayerService.nextPrayerTime} WIB)',
                  style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 15, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              const Text(
                'Mundur',
                style: TextStyle(color: textMuted, fontSize: 10),
              ),
              const SizedBox(height: 4),
              Text(
                PrayerService.timeToNextPrayerStr,
                style: const TextStyle(
                  color: Color(0xFF00ADB5),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildBreakScheduleCard(BuildContext context, AuthProvider auth, AttendanceRecord? today) {
    const cardBg = Color(0xFF393E46);
    const violet = Color(0xFFEEEEEE);
    const textMuted = Color(0x8DEEEEEE);
    const success = Color(0xFF10B981);
    const warning = Color(0xFFF59E0B);
    
    final sched = auth.todayBreakSchedule;

    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Color(0xFFEEEEEE).withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.coffee, color: violet, size: 20),
              SizedBox(width: 8),
              Text(
                'Jadwal Istirahat Anda Hari Ini',
                style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (sched == null) ...[
            const Text(
              'Belum ada jadwal istirahat ditentukan untuk Anda hari ini.',
              style: TextStyle(color: textMuted, fontSize: 13),
            ),
          ] else ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Sesi Istirahat', style: TextStyle(color: textMuted, fontSize: 11)),
                    const SizedBox(height: 4),
                    Text(
                      'Sesi ${sched.sesi}',
                      style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Waktu Jadwal', style: TextStyle(color: textMuted, fontSize: 11)),
                    const SizedBox(height: 4),
                    Text(
                      '${sched.jamMulai} - ${sched.jamSelesai} WIB',
                      style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (today == null || today.clockIn == null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.amber.withOpacity(0.3)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.warning_amber_rounded, color: warning, size: 16),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Silakan Clock-In terlebih dahulu untuk dapat memulai istirahat Anda.',
                        style: TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ] else ...[
              // Display actual break timing status
              if (today.jamMulaiIstirahat != null) ...[
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Mulai Aktual', style: TextStyle(color: textMuted, fontSize: 11)),
                        const SizedBox(height: 4),
                        Text(
                          today.jamMulaiIstirahat!,
                          style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Selesai Aktual', style: TextStyle(color: textMuted, fontSize: 11)),
                        const SizedBox(height: 4),
                        Text(
                          today.jamAkhirIstirahat ?? '--:--',
                          style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Status Break', style: TextStyle(color: textMuted, fontSize: 11)),
                        const SizedBox(height: 4),
                        Text(
                          today.jamAkhirIstirahat != null ? 'Selesai' : 'Sedang Istirahat',
                          style: TextStyle(
                            color: today.jamAkhirIstirahat != null ? success : warning,
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
              ],

              // Show quick action buttons
              if (today.jamMulaiIstirahat == null) ...[
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: auth.isLoading
                        ? null
                        : () => _showConfirmBreakAction(
                              context,
                              'Mulai Istirahat',
                              'Apakah Anda yakin ingin memulai istirahat sekarang?',
                              () => auth.startBreak(),
                            ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: success,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.play_arrow, color: Color(0xFFEEEEEE)),
                    label: const Text('Mulai Istirahat', style: TextStyle(color: Color(0xFFEEEEEE), fontWeight: FontWeight.bold)),
                  ),
                ),
              ] else if (today.jamAkhirIstirahat == null) ...[
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton.icon(
                    onPressed: auth.isLoading
                        ? null
                        : () => _showConfirmBreakAction(
                              context,
                              'Selesai Istirahat',
                              'Apakah Anda yakin ingin menyelesaikan istirahat sekarang?',
                              () => auth.endBreak(),
                            ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: warning,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    icon: const Icon(Icons.stop, color: Color(0xFFEEEEEE)),
                    label: const Text('Selesai Istirahat', style: TextStyle(color: Color(0xFFEEEEEE), fontWeight: FontWeight.bold)),
                  ),
                ),
              ] else ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: Color(0xFFEEEEEE).withOpacity(0.03),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text(
                      '🎉 Anda telah menyelesaikan istirahat hari ini.',
                      style: TextStyle(color: success, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ],
          ],
          // Success/Error banners
          if (auth.attendanceSuccess != null) ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                auth.attendanceSuccess!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: success, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
          if (auth.attendanceError != null) ...[
            const SizedBox(height: 12),
            Center(
              child: Text(
                auth.attendanceError!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMenuCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    const cardBg = Color(0xFF393E46);
    const violet = Color(0xFFEEEEEE);
    const textMuted = Color(0x8DEEEEEE);

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFEEEEEE).withOpacity(0.05)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: violet, size: 28),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 12, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              subtitle,
              style: const TextStyle(color: textMuted, fontSize: 9),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  void _showConfirmBreakAction(BuildContext context, String title, String message, VoidCallback onConfirm) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Text(
            title,
            style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold),
          ),
          content: Text(
            message,
            style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 14),
          ),
          actions: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 4.0),
              child: Row(
                children: [
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEEEEEE),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () {
                        Navigator.pop(context);
                        onConfirm();
                      },
                      child: const Text('YA', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0x1AEEEEEE)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () {
                        Navigator.pop(context);
                      },
                      child: const Text('BATAL', style: TextStyle(color: Color(0x8DEEEEEE), fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            )
          ],
        );
      },
    );
  }

  Widget _buildGojekMenuItem({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: const Color(0xFF00ADB5),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF00ADB5).withOpacity(0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Icon(icon, color: Colors.white, size: 26),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFFEEEEEE),
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  void _showPrayerScheduleModal(BuildContext context, AuthProvider auth) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF222831),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        final timings = PrayerService.timings ?? {};
        final city = PrayerService.currentCity ?? 'Jakarta';
        final nextPrayer = PrayerService.nextPrayerName;

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 20.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: const Color(0xFFEEEEEE).withOpacity(0.2),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Jadwal Sholat',
                            style: TextStyle(
                              color: Color(0xFFEEEEEE),
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Wilayah $city & Sekitarnya',
                            style: const TextStyle(
                              color: Color(0x8DEEEEEE),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFF00ADB5).withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF00ADB5).withOpacity(0.3)),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.gps_fixed, color: Color(0xFF00ADB5), size: 14),
                            SizedBox(width: 4),
                            Text(
                              'Auto GPS',
                              style: TextStyle(
                                color: Color(0xFF00ADB5),
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  if (timings.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 30),
                        child: Text(
                          'Mengambil data jadwal sholat...',
                          style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 13),
                        ),
                      ),
                    )
                  else
                    ...timings.entries.map((entry) {
                      final name = entry.key;
                      final time = entry.value;
                      final isNext = name.toLowerCase() == nextPrayer.toLowerCase();

                      return Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: isNext
                              ? const Color(0xFF00ADB5).withOpacity(0.12)
                              : const Color(0xFF393E46),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: isNext
                                ? const Color(0xFF00ADB5).withOpacity(0.4)
                                : const Color(0xFFEEEEEE).withOpacity(0.03),
                            width: 1.5,
                          ),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Icon(
                                  isNext ? Icons.notifications_active : Icons.notifications_none,
                                  color: isNext ? const Color(0xFF00ADB5) : const Color(0x8DEEEEEE),
                                  size: 20,
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  name,
                                  style: TextStyle(
                                    color: const Color(0xFFEEEEEE),
                                    fontSize: 14,
                                    fontWeight: isNext ? FontWeight.bold : FontWeight.normal,
                                  ),
                                ),
                              ],
                            ),
                            Row(
                              children: [
                                Text(
                                  time,
                                  style: TextStyle(
                                    color: isNext ? const Color(0xFF00ADB5) : const Color(0xFFEEEEEE),
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Text(
                                  'WIB',
                                  style: TextStyle(
                                    color: Color(0x8DEEEEEE),
                                    fontSize: 10,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    }).toList(),
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildAiQuoteCard(AuthProvider auth) {
    final sapaanAiList = auth.informations.where((info) => info.judul.startsWith('[Sapaan AI]')).toList();
    
    String rawQuoteText = '';
    String rawAuthorText = 'Barokah AI';
    
    if (sapaanAiList.isNotEmpty) {
      final fullMsg = sapaanAiList.first.isiInformasi;
      if (fullMsg.contains('~')) {
        final parts = fullMsg.split('~');
        rawQuoteText = parts[0].replaceAll('"', '').trim();
        rawAuthorText = parts[1].trim();
      } else {
        rawQuoteText = fullMsg.replaceAll('"', '').trim();
      }
    }
    
    // Fallback jika quote kosong
    if (rawQuoteText.isEmpty) {
      final now = DateTime.now();
      final index = now.day % 4;
      final fallbacks = [
        'Kejujuran dan integritas adalah kunci utama menjemput rezeki yang barokah.',
        'Setiap langkah kecil kedisiplinan hari ini adalah investasi kesuksesan hari esok.',
        'Kerja keras mendatangkan hasil, kerja cerdas mendatangkan efisiensi, kerja ikhlas mendatangkan berkah.',
        'Kualitas pelayanan terbaik lahir dari hati yang tulus dan senyum yang ramah.'
      ];
      rawQuoteText = fallbacks[index];
      rawAuthorText = 'Barokah AI';
    }

    return Container(
      padding: const EdgeInsets.all(20.0),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF393E46), Color(0xFF222831)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF00ADB5).withOpacity(0.2), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00ADB5).withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: Color(0xFF00ADB5), size: 20),
              const SizedBox(width: 8),
              const Text(
                'MOTIVASI HARI INI',
                style: TextStyle(
                  color: Color(0xFF00ADB5),
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.2,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            '"$rawQuoteText"',
            style: const TextStyle(
              color: Color(0xFFEEEEEE),
              fontSize: 14,
              fontStyle: FontStyle.italic,
              fontWeight: FontWeight.w600,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.bottomRight,
            child: Text(
              '— $rawAuthorText',
              style: const TextStyle(
                color: Color(0xFF00ADB5),
                fontSize: 11,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<Position?> _getCurrentLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Layanan GPS lokasi tidak aktif. Silakan aktifkan GPS Anda.')),
        );
      }
      return null;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Izin akses lokasi ditolak.')),
          );
        }
        return null;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Izin lokasi ditolak secara permanen. Silakan aktifkan lewat pengaturan HP.')),
        );
      }
      return null;
    } 

    return await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
  }

  Future<String?> _takeSelfie() async {
    final ImagePicker picker = ImagePicker();
    try {
      final XFile? image = await picker.pickImage(
        source: ImageSource.camera,
        preferredCameraDevice: CameraDevice.front,
        maxWidth: 600,
        maxHeight: 600,
        imageQuality: 70,
      );
      if (image == null) return null;
      final bytes = await image.readAsBytes();
      return 'data:image/jpeg;base64,${base64Encode(bytes)}';
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gagal mengakses kamera: $e')),
        );
      }
      return null;
    }
  }

  void _performClockIn(AuthProvider auth) async {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Silakan ambil foto selfie masuk untuk verifikasi wajah.')),
      );
    }

    final base64Photo = await _takeSelfie();
    if (base64Photo == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Absensi dibatalkan: Foto selfie wajib.')),
        );
      }
      return;
    }

    String? notes;
    if (mounted) {
      notes = await showDialog<String>(
        context: context,
        builder: (context) {
          final controller = TextEditingController();
          return AlertDialog(
            backgroundColor: const Color(0xFF393E46),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text('Catatan Kehadiran', style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold)),
            content: TextField(
              controller: controller,
              style: const TextStyle(color: Color(0xFFEEEEEE)),
              decoration: const InputDecoration(
                hintText: 'Tulis keterangan/catatan (opsional)...',
                hintStyle: TextStyle(color: Color(0x52EEEEEE)),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0x33EEEEEE))),
                focusedBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF00ADB5))),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context, controller.text),
                child: const Text('KIRIM & ABSEN', style: TextStyle(color: Color(0xFF00ADB5), fontWeight: FontWeight.bold)),
              ),
              TextButton(
                onPressed: () => Navigator.pop(context, null),
                child: const Text('BATAL', style: TextStyle(color: Color(0x8DEEEEEE))),
              ),
            ],
          );
        }
      );
      if (notes == null) return; // Dibatalkan oleh user
    }

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5))),
      );
    }

    try {
      await auth.clockIn(0.0, 0.0, notes: notes, photoSelfie: base64Photo);
      if (mounted) Navigator.pop(context); // Tutup loading

      if (auth.attendanceError != null && mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            backgroundColor: const Color(0xFF393E46),
            title: const Text('Gagal Absensi', style: TextStyle(color: Colors.redAccent)),
            content: Text(auth.attendanceError!, style: const TextStyle(color: Color(0xFFEEEEEE))),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK', style: TextStyle(color: Color(0xFF00ADB5))))
            ],
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(auth.attendanceSuccess ?? 'Berhasil Clock-In!')),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Terjadi kesalahan: $e')));
      }
    }
  }

  void _performClockOut(AuthProvider auth) async {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Silakan ambil foto selfie pulang untuk verifikasi wajah.')),
      );
    }

    final base64Photo = await _takeSelfie();
    if (base64Photo == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Absensi dibatalkan: Foto selfie wajib.')),
        );
      }
      return;
    }

    bool confirm = false;
    if (mounted) {
      confirm = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          backgroundColor: const Color(0xFF393E46),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text('Konfirmasi Pulang', style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 16, fontWeight: FontWeight.bold)),
          content: const Text('Apakah Anda yakin ingin melakukan Clock-Out sekarang?', style: TextStyle(color: Color(0x8DEEEEEE))),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('YA, PULANG', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('BATAL', style: TextStyle(color: Color(0x8DEEEEEE))),
            ),
          ],
        )
      ) ?? false;
    }

    if (!confirm) return;

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5))),
      );
    }

    try {
      await auth.clockOut(0.0, 0.0, photoSelfie: base64Photo);
      if (mounted) Navigator.pop(context); // Tutup loading

      if (auth.attendanceError != null && mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            backgroundColor: const Color(0xFF393E46),
            title: const Text('Gagal Absensi', style: TextStyle(color: Colors.redAccent)),
            content: Text(auth.attendanceError!, style: const TextStyle(color: Color(0xFFEEEEEE))),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK', style: TextStyle(color: Color(0xFF00ADB5))))
            ],
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(auth.attendanceSuccess ?? 'Berhasil Clock-Out!')),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Terjadi kesalahan: $e')));
      }
    }
  }

  void _performStartBreak(AuthProvider auth) async {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Silakan ambil foto selfie untuk verifikasi mulai istirahat.')),
      );
    }

    final base64Photo = await _takeSelfie();
    if (base64Photo == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Istirahat dibatalkan: Foto selfie wajib.')),
        );
      }
      return;
    }

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5))),
      );
    }

    try {
      await auth.startBreak(photoSelfie: base64Photo);
      if (mounted) Navigator.pop(context);

      if (auth.attendanceError != null && mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            backgroundColor: const Color(0xFF393E46),
            title: const Text('Gagal Mulai Istirahat', style: TextStyle(color: Colors.redAccent)),
            content: Text(auth.attendanceError!, style: const TextStyle(color: Color(0xFFEEEEEE))),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK', style: TextStyle(color: Color(0xFF00ADB5))))
            ],
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(auth.attendanceSuccess ?? 'Mulai istirahat berhasil dicatat.')),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Terjadi kesalahan: $e')));
      }
    }
  }

  void _performEndBreak(AuthProvider auth) async {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Silakan ambil foto selfie untuk verifikasi selesai istirahat.')),
      );
    }

    final base64Photo = await _takeSelfie();
    if (base64Photo == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Istirahat dibatalkan: Foto selfie wajib.')),
        );
      }
      return;
    }

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5))),
      );
    }

    try {
      await auth.endBreak(photoSelfie: base64Photo);
      if (mounted) Navigator.pop(context);

      if (auth.attendanceError != null && mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            backgroundColor: const Color(0xFF393E46),
            title: const Text('Gagal Selesai Istirahat', style: TextStyle(color: Colors.redAccent)),
            content: Text(auth.attendanceError!, style: const TextStyle(color: Color(0xFFEEEEEE))),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK', style: TextStyle(color: Color(0xFF00ADB5))))
            ],
          ),
        );
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(auth.attendanceSuccess ?? 'Selesai istirahat berhasil dicatat.')),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Terjadi kesalahan: $e')));
      }
    }
  }
  bool _isSyncing = false;

  Widget _buildSyncButton(BuildContext context, AuthProvider auth) {
    const teal = Color(0xFF00ADB5);
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: _isSyncing ? null : () async {
          setState(() => _isSyncing = true);
          try {
            await auth.fullSync();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('✅ Sinkronisasi berhasil! Semua data telah diperbarui.'),
                  backgroundColor: Color(0xFF10B981),
                  duration: Duration(seconds: 2),
                ),
              );
            }
          } catch (e) {
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('❌ Gagal sinkronisasi: $e'),
                  backgroundColor: const Color(0xFFEF4444),
                ),
              );
            }
          } finally {
            if (mounted) setState(() => _isSyncing = false);
          }
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: _isSyncing ? const Color(0xFF393E46) : teal,
          foregroundColor: Colors.white,
          disabledBackgroundColor: const Color(0xFF393E46),
          disabledForegroundColor: Colors.white54,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          padding: const EdgeInsets.symmetric(vertical: 14),
          elevation: _isSyncing ? 0 : 4,
        ),
        icon: _isSyncing
            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white70))
            : const Icon(Icons.sync_rounded, size: 20),
        label: Text(
          _isSyncing ? 'Menyinkronkan...' : '🔄 Sinkronisasi Data',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildAttendanceActionButtons(BuildContext context, AuthProvider auth, AttendanceRecord? today) {
    const success = Color(0xFF10B981);
    const danger = Color(0xFFEF4444);
    const primary = Color(0xFF00ADB5);

    // Hitung status keaktifan masing-masing dari 4 tombol
    final bool canClockIn = today == null || today.clockIn == null;
    final bool canStartBreak = today != null && today.clockIn != null && today.clockOut == null && today.jamMulaiIstirahat == null;
    final bool canEndBreak = today != null && today.clockIn != null && today.clockOut == null && today.jamMulaiIstirahat != null && today.jamAkhirIstirahat == null;
    final bool canClockOut = today != null && today.clockIn != null && today.clockOut == null;

    Widget buildButton({
      required String label,
      required IconData icon,
      required Color color,
      required bool isActive,
      required VoidCallback onPressed,
    }) {
      return Expanded(
        child: Opacity(
          opacity: isActive ? 1.0 : 0.4,
          child: ElevatedButton.icon(
            onPressed: isActive ? onPressed : null,
            style: ElevatedButton.styleFrom(
              backgroundColor: isActive ? color : const Color(0xFF393E46),
              foregroundColor: Colors.white,
              disabledBackgroundColor: const Color(0xFF393E46),
              disabledForegroundColor: Colors.white24,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              padding: const EdgeInsets.symmetric(vertical: 12),
              elevation: isActive ? 3 : 0,
            ),
            icon: Icon(icon, size: 16),
            label: Text(
              label,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 4),
        Row(
          children: [
            buildButton(
              label: 'Masuk Kerja',
              icon: Icons.login_rounded,
              color: primary,
              isActive: canClockIn,
              onPressed: () => _performClockIn(auth),
            ),
            const SizedBox(width: 8),
            buildButton(
              label: 'Mulai Istirahat',
              icon: Icons.coffee_rounded,
              color: Colors.amber[700]!,
              isActive: canStartBreak,
              onPressed: () => _performStartBreak(auth),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            buildButton(
              label: 'Selesai Istirahat',
              icon: Icons.coffee_outlined,
              color: success,
              isActive: canEndBreak,
              onPressed: () => _performEndBreak(auth),
            ),
            const SizedBox(width: 8),
            buildButton(
              label: 'Pulang Kerja',
              icon: Icons.logout_rounded,
              color: danger,
              isActive: canClockOut,
              onPressed: () => _performClockOut(auth),
            ),
          ],
        ),
      ],
    );
  }

  /// Membangun tabel jadwal istirahat 7 hari ke depan (Senin - Minggu)
  Widget _buildWeeklyBreakScheduleTable(BuildContext context, AuthProvider auth) {
    const cardBg = Color(0xFF393E46);
    const textMuted = Color(0x8DEEEEEE);
    const teal = Color(0xFF00ADB5);

    final weeklySchedules = auth.weeklyBreakSchedules;

    // Tentukan Senin minggu ini atau minggu depan
    final now = DateTime.now();
    final todayWeekday = now.weekday; // 1=Mon, 7=Sun
    final monday = now.subtract(Duration(days: todayWeekday - 1));

    // Build 7 hari Senin - Minggu
    final List<Map<String, dynamic>> weekDays = List.generate(7, (i) {
      final day = monday.add(Duration(days: i));
      final dateStr = '${day.year}-${day.month.toString().padLeft(2,'0')}-${day.day.toString().padLeft(2,'0')}';
      final dayNames = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
      final sched = weeklySchedules.firstWhere(
        (s) => s.date == dateStr,
        orElse: () => BreakSchedule(id: 0, employeeId: 0, date: dateStr, sesi: 0, jamMulai: '', jamSelesai: ''),
      );
      return {
        'dayName': dayNames[i],
        'date': dateStr,
        'displayDate': '${day.day}/${day.month}',
        'sched': sched,
        'isToday': dateStr == '${now.year}-${now.month.toString().padLeft(2,'0')}-${now.day.toString().padLeft(2,'0')}',
      };
    });

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFEEEEEE).withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.calendar_view_week_rounded, color: teal, size: 20),
              SizedBox(width: 8),
              Text(
                'Jadwal Istirahat Minggu Ini',
                style: TextStyle(color: Color(0xFFEEEEEE), fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 4),
          const Text(
            'Senin — Minggu',
            style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 11),
          ),
          const SizedBox(height: 16),
          if (weeklySchedules.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 20),
              decoration: BoxDecoration(
                color: teal.withOpacity(0.05),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: teal.withOpacity(0.1)),
              ),
              child: const Column(
                children: [
                  Icon(Icons.schedule_outlined, color: Color(0x8DEEEEEE), size: 28),
                  SizedBox(height: 8),
                  Text(
                    'Jadwal mingguan belum tersedia.',
                    style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                  Text(
                    'Admin akan meng-generate jadwal dari web.',
                    style: TextStyle(color: Color(0x5DEEEEEE), fontSize: 11),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          else
            ClipRRect(
              borderRadius: BorderRadius.circular(10),
              child: Table(
                border: TableBorder(
                  horizontalInside: BorderSide(color: const Color(0xFFEEEEEE).withOpacity(0.06), width: 1),
                  top: BorderSide(color: const Color(0xFFEEEEEE).withOpacity(0.08), width: 1),
                  bottom: BorderSide(color: const Color(0xFFEEEEEE).withOpacity(0.08), width: 1),
                  left: BorderSide(color: const Color(0xFFEEEEEE).withOpacity(0.08), width: 1),
                  right: BorderSide(color: const Color(0xFFEEEEEE).withOpacity(0.08), width: 1),
                ),
                columnWidths: const {
                  0: FlexColumnWidth(1.2),
                  1: FlexColumnWidth(0.8),
                  2: FlexColumnWidth(0.6),
                  3: FlexColumnWidth(1.8),
                },
                children: [
                  // Header
                  TableRow(
                    decoration: BoxDecoration(color: teal.withOpacity(0.12)),
                    children: ['Hari', 'Tanggal', 'Sesi', 'Waktu'].map((h) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
                      child: Text(h, style: const TextStyle(color: Color(0xFF00ADB5), fontSize: 11, fontWeight: FontWeight.bold)),
                    )).toList(),
                  ),
                  // Rows
                  ...weekDays.map((day) {
                    final sched = day['sched'] as BreakSchedule;
                    final isToday = day['isToday'] as bool;
                    final hasSchedule = sched.sesi > 0;
                    final sessColors = {1: const Color(0xFF00ADB5), 2: const Color(0xFFa78bfa), 3: const Color(0xFF22c55e)};
                    return TableRow(
                      decoration: BoxDecoration(
                        color: isToday
                            ? teal.withOpacity(0.08)
                            : const Color(0xFF2D3139),
                      ),
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                          child: Row(
                            children: [
                              if (isToday)
                                Container(
                                  width: 6, height: 6,
                                  margin: const EdgeInsets.only(right: 5),
                                  decoration: const BoxDecoration(color: teal, shape: BoxShape.circle),
                                ),
                              Flexible(
                                child: Text(
                                  day['dayName'],
                                  style: TextStyle(
                                    color: isToday ? teal : const Color(0xFFEEEEEE),
                                    fontSize: 12,
                                    fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                          child: Text(
                            day['displayDate'],
                            style: TextStyle(color: textMuted, fontSize: 11),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
                          child: hasSchedule
                              ? Text(
                                  'Sesi ${sched.sesi}',
                                  style: TextStyle(
                                    color: sessColors[sched.sesi] ?? teal,
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              : Text('-', style: TextStyle(color: textMuted, fontSize: 11)),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
                          child: hasSchedule
                              ? Text(
                                  '${sched.jamMulai} – ${sched.jamSelesai} WIB',
                                  style: TextStyle(
                                    color: sessColors[sched.sesi] ?? const Color(0xFFEEEEEE),
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                )
                              : Text('Belum ada jadwal', style: TextStyle(color: textMuted, fontSize: 10)),
                        ),
                      ],
                    );
                  }),
                ],
              ),
            ),
        ],
      ),
    );
  }
}
