import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../config/api_client.dart';

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const _bgDark = Color(0xFF222831);
const _cardBg = Color(0xFF393E46);
const _accentCyan = Color(0xFF00ADB5);
const _textMain = Color(0xFFEEEEEE);
const _textMuted = Color(0xFF9E9E9E);
const _successGreen = Color(0xFF4CAF50);
const _warningAmber = Color(0xFFFFC107);
const _borderColor = Color(0xFF4A5568);

// ─────────────────────────────────────────────────────────────
//  ANGKET LIST SCREEN
// ─────────────────────────────────────────────────────────────
class AngketScreen extends StatefulWidget {
  const AngketScreen({Key? key}) : super(key: key);

  @override
  State<AngketScreen> createState() => _AngketScreenState();
}

class _AngketScreenState extends State<AngketScreen> {
  List<dynamic> _angketList = [];
  List<dynamic> _completedAngketIds = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadAngket();
  }

  Future<void> _loadAngket() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final token = auth.token;

      // Fetch list angket aktif
      final res = await ApiClient.get('angket', token: token);
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = data is List ? data : (data['data'] ?? data['angket'] ?? []);
        
        // Fetch status penyelesaian karyawan
        List<dynamic> completed = [];
        try {
          final resCompleted = await ApiClient.get(
            'angket/completed?employee_id=${auth.profile?.employeeId ?? ''}',
            token: token,
          );
          if (resCompleted.statusCode == 200) {
            final cData = jsonDecode(resCompleted.body);
            completed = cData is List ? cData : (cData['data'] ?? []);
          }
        } catch (_) {}

        setState(() {
          _angketList = list;
          _completedAngketIds = completed.map((c) => c['angket_id']?.toString() ?? c['id']?.toString()).toList();
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Gagal memuat data angket (${res.statusCode})';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Koneksi gagal: ${e.toString()}';
        _isLoading = false;
      });
    }
  }

  bool _isCompleted(dynamic angket) {
    final id = angket['id']?.toString() ?? '';
    return _completedAngketIds.contains(id);
  }

  bool _isExpired(dynamic angket) {
    try {
      final tglAkhir = angket['tanggal_akhir'] ?? angket['expires_at'];
      if (tglAkhir == null) return false;
      return DateTime.now().isAfter(DateTime.parse(tglAkhir.toString()));
    } catch (_) {
      return false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bgDark,
      appBar: AppBar(
        backgroundColor: _cardBg,
        elevation: 0,
        iconTheme: const IconThemeData(color: _textMain),
        title: const Text(
          'Angket Karyawan',
          style: TextStyle(
            color: _textMain,
            fontSize: 18,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _accentCyan),
            onPressed: _loadAngket,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _accentCyan))
          : _error != null
              ? _buildError()
              : _angketList.isEmpty
                  ? _buildEmpty()
                  : RefreshIndicator(
                      onRefresh: _loadAngket,
                      color: _accentCyan,
                      backgroundColor: _cardBg,
                      child: ListView.builder(
                        padding: const EdgeInsets.all(16),
                        physics: const AlwaysScrollableScrollPhysics(),
                        itemCount: _angketList.length,
                        itemBuilder: (ctx, i) => _buildAngketCard(ctx, _angketList[i]),
                      ),
                    ),
    );
  }

  Widget _buildAngketCard(BuildContext context, dynamic angket) {
    final title = angket['judul'] ?? angket['title'] ?? 'Angket ${angket['id']}';
    final desc = angket['deskripsi'] ?? angket['description'] ?? '';
    final tglMulai = angket['tanggal_mulai'] ?? angket['created_at'] ?? '';
    final tglAkhir = angket['tanggal_akhir'] ?? angket['expires_at'] ?? '';
    final totalSoal = angket['total_soal'] ?? angket['question_count'] ?? '?';
    final completed = _isCompleted(angket);
    final expired = _isExpired(angket);

    String formattedEnd = '';
    try {
      if (tglAkhir.isNotEmpty) {
        formattedEnd = DateFormat('dd MMM yyyy', 'id_ID').format(DateTime.parse(tglAkhir));
      }
    } catch (_) {
      formattedEnd = tglAkhir;
    }

    Color statusColor = completed ? _successGreen : (expired ? Colors.red : _accentCyan);
    String statusText = completed ? 'Selesai' : (expired ? 'Expired' : 'Belum Diisi');
    IconData statusIcon = completed ? Icons.check_circle_rounded : (expired ? Icons.cancel_rounded : Icons.radio_button_unchecked_rounded);

    return GestureDetector(
      onTap: (completed || expired)
          ? null
          : () async {
              final result = await Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => AngketDetailScreen(angket: angket),
                ),
              );
              if (result == true) _loadAngket();
            },
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: _cardBg,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: completed ? _successGreen.withOpacity(0.4) : (expired ? Colors.red.withOpacity(0.3) : _borderColor),
            width: 1.5,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(
                        color: _textMain,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: statusColor.withOpacity(0.4)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(statusIcon, color: statusColor, size: 12),
                        const SizedBox(width: 4),
                        Text(
                          statusText,
                          style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (desc.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  desc,
                  style: const TextStyle(color: _textMuted, fontSize: 12),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  _infoChip(Icons.quiz_rounded, '$totalSoal Pertanyaan'),
                  const SizedBox(width: 8),
                  if (formattedEnd.isNotEmpty)
                    _infoChip(Icons.event_rounded, 'Sampai $formattedEnd'),
                ],
              ),
              if (!completed && !expired) ...[
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [_accentCyan, _accentCyan.withOpacity(0.7)],
                    ),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.edit_note_rounded, color: Colors.white, size: 16),
                      SizedBox(width: 6),
                      Text(
                        'ISI ANGKET',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _borderColor.withOpacity(0.5)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: _textMuted, size: 12),
          const SizedBox(width: 4),
          Text(text, style: const TextStyle(color: _textMuted, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off_rounded, color: _textMuted, size: 64),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Terjadi kesalahan.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: _textMuted, fontSize: 14),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _loadAngket,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Coba Lagi'),
              style: ElevatedButton.styleFrom(
                backgroundColor: _accentCyan,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.assignment_turned_in_outlined, color: _textMuted.withOpacity(0.5), size: 80),
            const SizedBox(height: 20),
            const Text(
              'Tidak Ada Angket Aktif',
              style: TextStyle(color: _textMain, fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            const Text(
              'Belum ada angket yang perlu diisi saat ini.\nSilakan cek kembali nanti.',
              textAlign: TextAlign.center,
              style: TextStyle(color: _textMuted, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
//  ANGKET DETAIL / PENGISIAN SCREEN
// ─────────────────────────────────────────────────────────────
class AngketDetailScreen extends StatefulWidget {
  final dynamic angket;

  const AngketDetailScreen({Key? key, required this.angket}) : super(key: key);

  @override
  State<AngketDetailScreen> createState() => _AngketDetailScreenState();
}

class _AngketDetailScreenState extends State<AngketDetailScreen> {
  List<dynamic> _questions = [];
  Map<int, String> _answers = {}; // questionIndex -> selected option
  bool _isLoading = true;
  bool _isSubmitting = false;
  String? _error;
  int _currentPage = 0;

  @override
  void initState() {
    super.initState();
    _loadQuestions();
  }

  Future<void> _loadQuestions() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final angketId = widget.angket['id']?.toString() ?? '';
      final res = await ApiClient.get('angket/$angketId/questions', token: auth.token);

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final questions = data is List ? data : (data['data'] ?? data['questions'] ?? []);
        setState(() {
          _questions = questions;
          _isLoading = false;
        });
      } else {
        // Fallback: gunakan pertanyaan dari data angket itu sendiri
        final embedded = widget.angket['pertanyaan'] ?? widget.angket['questions'] ?? [];
        setState(() {
          _questions = embedded is List ? embedded : [];
          _isLoading = false;
          if (_questions.isEmpty) _error = 'Tidak ada pertanyaan tersedia.';
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Gagal memuat pertanyaan: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _submitAngket() async {
    if (_answers.length < _questions.length) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Harap jawab semua pertanyaan terlebih dahulu.'),
          backgroundColor: _warningAmber,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final auth = Provider.of<AuthProvider>(context, listen: false);
      final angketId = widget.angket['id']?.toString() ?? '';

      final answersPayload = _questions.asMap().entries.map((entry) {
        final i = entry.key;
        final q = entry.value;
        return {
          'question_id': q['id']?.toString() ?? i.toString(),
          'answer': _answers[i] ?? '',
        };
      }).toList();

      final res = await ApiClient.post(
        'angket/$angketId/submit',
        {
          'employee_id': auth.profile?.employeeId?.toString() ?? '',
          'answers': answersPayload,
        },
        token: auth.token,
      );

      setState(() => _isSubmitting = false);

      if (res.statusCode == 200 || res.statusCode == 201) {
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => AlertDialog(
              backgroundColor: _cardBg,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 70,
                    height: 70,
                    decoration: BoxDecoration(
                      color: _successGreen.withOpacity(0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle_rounded, color: _successGreen, size: 48),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Angket Terkirim!',
                    style: TextStyle(color: _textMain, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Terima kasih atas partisipasi Anda dalam mengisi angket.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _textMuted, fontSize: 13),
                  ),
                ],
              ),
              actions: [
                Center(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      Navigator.pop(context, true);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _accentCyan,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      minimumSize: const Size(140, 42),
                    ),
                    child: const Text('Selesai'),
                  ),
                ),
              ],
            ),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal mengirim angket (${res.statusCode}). Coba lagi.'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } catch (e) {
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.angket['judul'] ?? widget.angket['title'] ?? 'Angket';

    return Scaffold(
      backgroundColor: _bgDark,
      appBar: AppBar(
        backgroundColor: _cardBg,
        elevation: 0,
        iconTheme: const IconThemeData(color: _textMain),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(color: _textMain, fontSize: 14, fontWeight: FontWeight.bold),
              overflow: TextOverflow.ellipsis,
            ),
            if (!_isLoading && _questions.isNotEmpty)
              Text(
                '${_answers.length} dari ${_questions.length} terjawab',
                style: const TextStyle(color: _textMuted, fontSize: 11),
              ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: _accentCyan))
          : _error != null || _questions.isEmpty
              ? _buildErrorOrEmpty()
              : Column(
                  children: [
                    // Progress bar
                    _buildProgressBar(),
                    // Question
                    Expanded(
                      child: _buildQuestionView(),
                    ),
                    // Navigation
                    _buildNavigation(),
                  ],
                ),
    );
  }

  Widget _buildProgressBar() {
    final progress = _questions.isEmpty ? 0.0 : (_currentPage + 1) / _questions.length;
    return Container(
      color: _cardBg,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Pertanyaan ${_currentPage + 1} dari ${_questions.length}',
                style: const TextStyle(color: _textMuted, fontSize: 12),
              ),
              Text(
                '${(_answers.length / _questions.length * 100).toInt()}% selesai',
                style: const TextStyle(color: _accentCyan, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: _borderColor,
              valueColor: const AlwaysStoppedAnimation<Color>(_accentCyan),
              minHeight: 6,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuestionView() {
    if (_currentPage >= _questions.length) return const SizedBox();
    final q = _questions[_currentPage];
    final questionText = q['pertanyaan'] ?? q['question'] ?? q['text'] ?? 'Pertanyaan ${_currentPage + 1}';
    final options = _parseOptions(q);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Question number badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _accentCyan.withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: _accentCyan.withOpacity(0.3)),
            ),
            child: Text(
              'SOAL ${_currentPage + 1}',
              style: const TextStyle(color: _accentCyan, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
          ),
          const SizedBox(height: 16),
          // Question text
          Text(
            questionText,
            style: const TextStyle(
              color: _textMain,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              height: 1.6,
            ),
          ),
          const SizedBox(height: 24),
          // Options
          ...options.asMap().entries.map((entry) {
            final optionLabel = entry.key;
            final optionText = entry.value;
            final letters = ['A', 'B', 'C', 'D', 'E'];
            final letter = optionLabel < letters.length ? letters[optionLabel] : (optionLabel + 1).toString();
            final isSelected = _answers[_currentPage] == optionText;

            return GestureDetector(
              onTap: () {
                setState(() {
                  _answers[_currentPage] = optionText;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isSelected ? _accentCyan.withOpacity(0.12) : _cardBg,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isSelected ? _accentCyan : _borderColor,
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: isSelected ? _accentCyan : _borderColor.withOpacity(0.5),
                        shape: BoxShape.circle,
                      ),
                      child: Center(
                        child: Text(
                          letter,
                          style: TextStyle(
                            color: isSelected ? Colors.white : _textMuted,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Text(
                        optionText,
                        style: TextStyle(
                          color: isSelected ? _textMain : _textMuted,
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        ),
                      ),
                    ),
                    if (isSelected)
                      const Icon(Icons.check_circle_rounded, color: _accentCyan, size: 20),
                  ],
                ),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  List<String> _parseOptions(dynamic q) {
    // Try different field names for options
    final raw = q['opsi'] ?? q['options'] ?? q['pilihan'];
    if (raw is List) {
      return raw.map((o) {
        if (o is String) return o;
        return o['text'] ?? o['opsi'] ?? o['label'] ?? o.toString();
      }).cast<String>().toList();
    }
    if (raw is String) {
      try {
        final decoded = jsonDecode(raw);
        if (decoded is List) {
          return decoded.map((o) => o.toString()).toList();
        }
      } catch (_) {
        return raw.split('\n').where((s) => s.trim().isNotEmpty).toList();
      }
    }
    // Check individual option fields A, B, C, D
    final List<String> opts = [];
    for (final key in ['opsi_a', 'opsi_b', 'opsi_c', 'opsi_d', 'opsi_e', 'option_a', 'option_b', 'option_c', 'option_d']) {
      if (q[key] != null && q[key].toString().isNotEmpty) {
        opts.add(q[key].toString());
      }
    }
    return opts.isNotEmpty ? opts : ['Opsi A', 'Opsi B', 'Opsi C', 'Opsi D'];
  }

  Widget _buildNavigation() {
    final isLast = _currentPage == _questions.length - 1;
    final hasAnswered = _answers.containsKey(_currentPage);

    return Container(
      color: _cardBg,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      child: Row(
        children: [
          if (_currentPage > 0)
            Expanded(
              child: OutlinedButton.icon(
                onPressed: () => setState(() => _currentPage--),
                icon: const Icon(Icons.arrow_back_ios_rounded, size: 14),
                label: const Text('Sebelumnya'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: _textMuted,
                  side: const BorderSide(color: _borderColor),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          if (_currentPage > 0) const SizedBox(width: 12),
          Expanded(
            flex: isLast ? 1 : 1,
            child: isLast
                ? ElevatedButton.icon(
                    onPressed: _isSubmitting ? null : _submitAngket,
                    icon: _isSubmitting
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.send_rounded, size: 16),
                    label: Text(_isSubmitting ? 'Mengirim...' : 'Kirim Angket'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _answers.length == _questions.length ? _successGreen : _warningAmber,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  )
                : ElevatedButton.icon(
                    onPressed: hasAnswered ? () => setState(() => _currentPage++) : null,
                    icon: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                    label: const Text('Selanjutnya'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: hasAnswered ? _accentCyan : _borderColor,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorOrEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _error != null ? Icons.error_outline_rounded : Icons.quiz_outlined,
              color: _textMuted,
              size: 64,
            ),
            const SizedBox(height: 16),
            Text(
              _error ?? 'Tidak ada pertanyaan tersedia.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: _textMuted, fontSize: 14),
            ),
            if (_error != null) ...[
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: _loadQuestions,
                icon: const Icon(Icons.refresh_rounded),
                label: const Text('Coba Lagi'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: _accentCyan,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
