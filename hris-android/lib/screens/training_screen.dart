import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../config/api_client.dart';
import 'sop_screen.dart'; // Import to use NativeBrowser

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({Key? key}) : super(key: key);

  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // ─── Tab 1: Jadwal Training ───────────────────────────────────────────────
  List<dynamic> _scheduleList = [];
  bool _scheduleLoading = false;
  String? _scheduleError;

  // ─── Tab 2: Hasil & Evaluasi ──────────────────────────────────────────────
  List<dynamic> _resultsList = [];
  bool _resultsLoading = false;
  String? _resultsError;
  int? _expandedResultIndex;

  // ─── Tab 3: Materi Training ───────────────────────────────────────────────
  List<dynamic> _materials = [];
  bool _materialsLoading = false;
  String? _materialsError;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        if (_tabController.index == 0 && _scheduleList.isEmpty && !_scheduleLoading) {
          _fetchSchedule();
        } else if (_tabController.index == 1 && _resultsList.isEmpty && !_resultsLoading) {
          _fetchResults();
        } else if (_tabController.index == 2 && _materials.isEmpty && !_materialsLoading) {
          _fetchMaterials();
        }
      }
    });
    // Load all tabs upfront
    _fetchSchedule();
    _fetchResults();
    _fetchMaterials();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // ─── Fetchers ─────────────────────────────────────────────────────────────

  Future<void> _fetchSchedule() async {
    if (!mounted) return;
    setState(() { _scheduleLoading = true; _scheduleError = null; });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final res = await ApiClient.get('training-schedule/employee', token: auth.token);
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() { _scheduleList = data['data'] ?? []; });
      } else {
        setState(() { _scheduleError = data['message'] ?? 'Gagal memuat jadwal training.'; });
      }
    } catch (e) {
      setState(() { _scheduleError = 'Koneksi ke server terganggu.'; });
    } finally {
      if (mounted) setState(() { _scheduleLoading = false; });
    }
  }

  Future<void> _fetchResults() async {
    if (!mounted) return;
    setState(() { _resultsLoading = true; _resultsError = null; });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final res = await ApiClient.get('training-results/outlet', token: auth.token);
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() { _resultsList = data['data'] ?? []; });
      } else {
        setState(() { _resultsError = data['message'] ?? 'Gagal memuat data evaluasi.'; });
      }
    } catch (e) {
      setState(() { _resultsError = 'Koneksi ke server terganggu.'; });
    } finally {
      if (mounted) setState(() { _resultsLoading = false; });
    }
  }

  Future<void> _fetchMaterials() async {
    if (!mounted) return;
    setState(() { _materialsLoading = true; _materialsError = null; });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final res = await ApiClient.get('training-media', token: auth.token);
      final data = jsonDecode(res.body);
      if (res.statusCode == 200) {
        setState(() { _materials = data['materials'] ?? data['data'] ?? []; });
      } else {
        setState(() { _materialsError = data['message'] ?? 'Gagal memuat materi training.'; });
      }
    } catch (e) {
      setState(() { _materialsError = 'Koneksi ke server terganggu.'; });
    } finally {
      if (mounted) setState(() { _materialsLoading = false; });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  String? _getYouTubeId(String? url) {
    if (url == null) return null;
    final regExp = RegExp(r'^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*');
    final match = regExp.firstMatch(url);
    if (match != null && match.groupCount >= 2) {
      final id = match.group(2);
      if (id != null && id.length == 11) return id;
    }
    return null;
  }

  Color _statusColor(String? status) {
    switch ((status ?? '').toLowerCase()) {
      case 'berjalan': return const Color(0xFF00ADB5);
      case 'selesai':  return const Color(0xFF4ADE80);
      case 'mendatang': return const Color(0xFFF5A623);
      default: return const Color(0x8DEEEEEE);
    }
  }

  String _statusLabel(String? status) {
    switch ((status ?? '').toLowerCase()) {
      case 'berjalan':  return '🟢 Sedang Berjalan';
      case 'selesai':   return '✅ Selesai';
      case 'mendatang': return '🟡 Mendatang';
      default: return status ?? '—';
    }
  }

  String _fmtDate(String? iso) {
    if (iso == null || iso.isEmpty) return '—';
    try {
      final d = DateTime.parse(iso);
      return '${d.day.toString().padLeft(2,'0')}/${d.month.toString().padLeft(2,'0')}/${d.year}';
    } catch (_) { return iso; }
  }

  // ─── Build: TAB 1 - Jadwal Training ──────────────────────────────────────

  Widget _buildScheduleTab() {
    if (_scheduleLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5)));
    }
    if (_scheduleError != null) {
      return _buildErrorWidget(_scheduleError!, _fetchSchedule);
    }
    if (_scheduleList.isEmpty) {
      return _buildEmptyWidget(
        icon: Icons.calendar_today_outlined,
        title: 'Belum Ada Jadwal Training',
        subtitle: 'Jadwal training yang ditugaskan untuk Anda akan muncul di sini.',
      );
    }
    return RefreshIndicator(
      color: const Color(0xFF00ADB5),
      onRefresh: _fetchSchedule,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _scheduleList.length,
        itemBuilder: (context, index) => _buildScheduleCard(_scheduleList[index]),
      ),
    );
  }

  Widget _buildScheduleCard(dynamic item) {
    final statusClr = _statusColor(item['status']);
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF393E46),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: statusClr.withOpacity(0.35), width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: status pill + divisi
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusClr.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusClr.withOpacity(0.4)),
                  ),
                  child: Text(
                    _statusLabel(item['status']),
                    style: TextStyle(color: statusClr, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
                const Spacer(),
                if (item['divisi'] != null && item['divisi'].toString().isNotEmpty)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0x1400ADB5),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _toTitleCase(item['divisi'].toString()),
                      style: const TextStyle(color: Color(0xFF00ADB5), fontSize: 10),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            // Program name
            Text(
              _toTitleCase(item['nama_program'] ?? 'Program Tanpa Nama'),
              style: const TextStyle(
                color: Color(0xFFEEEEEE),
                fontWeight: FontWeight.bold,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 10),
            // Date row
            _buildInfoRow(Icons.calendar_month_outlined, 'Mulai', _fmtDate(item['tanggal_mulai']?.toString())),
            const SizedBox(height: 4),
            _buildInfoRow(Icons.event_available_outlined, 'Selesai', _fmtDate(item['tanggal_selesai']?.toString())),
            const SizedBox(height: 4),
            _buildInfoRow(Icons.people_outline, 'Kuota', '${item['kuota'] ?? '—'} peserta'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF00ADB5), size: 14),
        const SizedBox(width: 6),
        Text('$label: ', style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 12)),
        Text(value, style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 12, fontWeight: FontWeight.w600)),
      ],
    );
  }

  // ─── Build: TAB 2 - Hasil & Evaluasi ─────────────────────────────────────

  Widget _buildResultsTab() {
    if (_resultsLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5)));
    }
    if (_resultsError != null) {
      return _buildErrorWidget(_resultsError!, _fetchResults);
    }
    if (_resultsList.isEmpty) {
      return _buildEmptyWidget(
        icon: Icons.bar_chart_outlined,
        title: 'Belum Ada Data Evaluasi',
        subtitle: 'Data hasil & evaluasi training untuk outlet Anda akan muncul di sini.',
      );
    }
    return RefreshIndicator(
      color: const Color(0xFF00ADB5),
      onRefresh: _fetchResults,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _resultsList.length,
        itemBuilder: (context, index) => _buildResultCard(_resultsList[index], index),
      ),
    );
  }

  Widget _buildResultCard(dynamic item, int index) {
    final isExpanded = _expandedResultIndex == index;
    final participants = (item['participants'] as List<dynamic>?) ?? [];
    final statusClr = _statusColor(item['status']);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF393E46),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: statusClr.withOpacity(0.3), width: 1.5),
      ),
      child: Column(
        children: [
          // Header - tappable to expand
          InkWell(
            borderRadius: BorderRadius.circular(14),
            onTap: () {
              setState(() {
                _expandedResultIndex = isExpanded ? null : index;
              });
            },
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: statusClr.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: statusClr.withOpacity(0.4)),
                              ),
                              child: Text(
                                _statusLabel(item['status']),
                                style: TextStyle(color: statusClr, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _toTitleCase(item['nama_program'] ?? '—'),
                          style: const TextStyle(
                            color: Color(0xFFEEEEEE),
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_fmtDate(item['tanggal_mulai']?.toString())} — ${_fmtDate(item['tanggal_selesai']?.toString())}',
                          style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 11),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${participants.length} karyawan di outlet ini',
                          style: const TextStyle(color: Color(0xFF00ADB5), fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: const Color(0x8DEEEEEE),
                    size: 20,
                  ),
                ],
              ),
            ),
          ),
          // Expanded: participant list
          if (isExpanded) ...[
            Divider(color: statusClr.withOpacity(0.2), height: 1),
            if (participants.isEmpty)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Tidak ada karyawan di outlet ini.',
                  style: TextStyle(color: Color(0x8DEEEEEE), fontSize: 12),
                  textAlign: TextAlign.center,
                ),
              )
            else
              ...participants.map((p) => _buildParticipantRow(p, item['status'])),
          ],
        ],
      ),
    );
  }

  Widget _buildParticipantRow(dynamic p, String? trainingStatus) {
    final statusStr = trainingStatus == 'selesai' ? 'Selesai' :
                      (trainingStatus == 'berjalan' ? 'Sedang Berjalan' : 'Mendatang');
    final statusClr = _statusColor(trainingStatus);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: const Color(0xFF222831).withOpacity(0.6), width: 1)),
      ),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: const Color(0xFF00ADB5).withOpacity(0.15),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFF00ADB5).withOpacity(0.3)),
            ),
            child: const Icon(Icons.person_outline, color: Color(0xFF00ADB5), size: 16),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _toTitleCase(p['full_name'] ?? '—'),
                  style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 12, fontWeight: FontWeight.w600),
                ),
                Text(
                  p['position'] ?? '',
                  style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 10),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: statusClr.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              statusStr,
              style: TextStyle(color: statusClr, fontSize: 9, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Build: TAB 3 - Materi Training ──────────────────────────────────────

  Widget _buildMaterialsTab() {
    if (_materialsLoading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF00ADB5)));
    }
    if (_materialsError != null) {
      return _buildErrorWidget(_materialsError!, _fetchMaterials);
    }
    if (_materials.isEmpty) {
      return _buildEmptyWidget(
        icon: Icons.library_books_outlined,
        title: 'Belum Ada Materi Training',
        subtitle: 'Materi & modul training yang ditambahkan admin akan tampil di sini.',
      );
    }
    return RefreshIndicator(
      color: const Color(0xFF00ADB5),
      onRefresh: _fetchMaterials,
      child: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 0.72,
        ),
        itemCount: _materials.length,
        itemBuilder: (context, index) => _buildMaterialCard(_materials[index]),
      ),
    );
  }

  Widget _buildMaterialCard(dynamic item) {
    const cardBg = Color(0xFF393E46);
    const textMain = Color(0xFFEEEEEE);
    const textMuted = Color(0x8DEEEEEE);

    final title = _toTitleCase(item['title'] ?? 'Materi Tanpa Judul');
    final desc = _toTitleCase(item['desc'] ?? '');
    final type = item['file_type'] ?? 'pdf';
    final linkUrl = item['link_url'] ?? '';
    final fileData = item['file_data'] ?? '';

    Color typeColor;
    IconData typeIcon;
    Widget? mediaThumbnail;

    switch (type) {
      case 'pdf':
        typeColor = const Color(0xFFE05C5C);
        typeIcon = Icons.picture_as_pdf_outlined;
        break;
      case 'image':
        typeColor = const Color(0xFFF5A623);
        typeIcon = Icons.image_outlined;
        if (fileData.isNotEmpty) {
          mediaThumbnail = Image.memory(
            base64Decode(fileData.split(',').last),
            fit: BoxFit.cover, width: double.infinity, height: 120,
            errorBuilder: (_, __, ___) => const SizedBox(),
          );
        }
        break;
      case 'video':
        typeColor = const Color(0xFFA78BFA);
        typeIcon = Icons.play_circle_outline;
        final ytId = _getYouTubeId(linkUrl);
        if (ytId != null) {
          mediaThumbnail = Stack(
            alignment: Alignment.center,
            children: [
              Image.network(
                'https://img.youtube.com/vi/$ytId/0.jpg',
                fit: BoxFit.cover, width: double.infinity, height: 120,
                errorBuilder: (_, __, ___) => const SizedBox(),
              ),
              Container(
                decoration: BoxDecoration(color: Colors.black.withOpacity(0.4), shape: BoxShape.circle),
                padding: const EdgeInsets.all(8),
                child: const Icon(Icons.play_arrow, color: Colors.white, size: 28),
              ),
            ],
          );
        }
        break;
      case 'instagram':
        typeColor = const Color(0xFFE1306C);
        typeIcon = Icons.camera_alt_outlined;
        break;
      case 'tiktok':
        typeColor = const Color(0xFF00ADB5);
        typeIcon = Icons.music_note_outlined;
        break;
      default:
        typeColor = const Color(0xFF4ECDC4);
        typeIcon = Icons.link;
    }

    return Card(
      color: cardBg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: typeColor.withOpacity(0.2), width: 1.5),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () {
          if (linkUrl.isNotEmpty) {
            NativeBrowser.openUrl(linkUrl);
          } else if (fileData.isNotEmpty) {
            NativeBrowser.openUrl(fileData);
          }
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Type badge
            Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Icon(typeIcon, color: typeColor, size: 18),
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: typeColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(type.toUpperCase(), style: TextStyle(color: typeColor, fontSize: 9, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
            // Media preview / icon placeholder
            if (mediaThumbnail != null)
              mediaThumbnail
            else
              Container(
                height: 80, width: double.infinity,
                color: typeColor.withOpacity(0.04),
                child: Center(child: Icon(typeIcon, color: typeColor.withOpacity(0.3), size: 40)),
              ),
            // Title & desc
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2, overflow: TextOverflow.ellipsis,
                    style: const TextStyle(color: textMain, fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  if (desc.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(
                      desc,
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: textMuted, fontSize: 10),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Shared Widgets ───────────────────────────────────────────────────────

  Widget _buildErrorWidget(String msg, VoidCallback onRetry) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 48),
            const SizedBox(height: 12),
            Text(msg, style: const TextStyle(color: Color(0xFFEEEEEE), fontSize: 13), textAlign: TextAlign.center),
            const SizedBox(height: 20),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF393E46)),
              onPressed: onRetry,
              child: const Text('Muat Ulang', style: TextStyle(color: Color(0xFFEEEEEE))),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyWidget({required IconData icon, required String title, required String subtitle}) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: const Color(0x3D00ADB5), size: 64),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(color: Color(0xFFEEEEEE), fontWeight: FontWeight.bold, fontSize: 15)),
            const SizedBox(height: 8),
            Text(subtitle, style: const TextStyle(color: Color(0x8DEEEEEE), fontSize: 12), textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }

  // ─── Main Build ───────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    const darkBg = Color(0xFF222831);
    const cardBg = Color(0xFF393E46);
    const cyan   = Color(0xFF00ADB5);
    const textMain = Color(0xFFEEEEEE);
    const textMuted = Color(0x8DEEEEEE);

    return Scaffold(
      backgroundColor: darkBg,
      appBar: AppBar(
        backgroundColor: cardBg,
        elevation: 0,
        title: const Text(
          'PELATIHAN',
          style: TextStyle(color: textMain, fontSize: 15, fontWeight: FontWeight.bold, letterSpacing: 1.2),
        ),
        centerTitle: true,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: cyan,
          indicatorWeight: 3,
          labelColor: cyan,
          unselectedLabelColor: textMuted,
          labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
          unselectedLabelStyle: const TextStyle(fontSize: 11),
          tabs: const [
            Tab(icon: Icon(Icons.calendar_today_outlined, size: 16), text: 'Jadwal Training'),
            Tab(icon: Icon(Icons.bar_chart_outlined, size: 16), text: 'Hasil & Evaluasi'),
            Tab(icon: Icon(Icons.library_books_outlined, size: 16), text: 'Materi Training'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildScheduleTab(),
          _buildResultsTab(),
          _buildMaterialsTab(),
        ],
      ),
    );
  }
}

// ─── Title Case Helper ────────────────────────────────────────────────────────

String _toTitleCase(String text) {
  if (text.isEmpty) return text;
  return text.split(' ').map((word) {
    if (word.isEmpty) return '';
    return word[0].toUpperCase() + word.substring(1).toLowerCase();
  }).join(' ');
}

// Keep toTitleCase as public for backwards compat if used elsewhere
String toTitleCase(String text) => _toTitleCase(text);
