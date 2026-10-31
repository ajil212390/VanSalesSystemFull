import 'package:flutter/material.dart';
import '../providers/app_state.dart';

class CollectEmptyScreen extends StatefulWidget {
  const CollectEmptyScreen({super.key});

  @override
  State<CollectEmptyScreen> createState() => _CollectEmptyScreenState();
}

class _CollectEmptyScreenState extends State<CollectEmptyScreen> {
  Customer? _selectedCustomer;
  final Map<String, int> _counts = {};
  bool _showSuccess = false;
  Map<String, int> _savedSummary = {};

  int _getCount(String weight) => _counts[weight] ?? 0;

  void _updateCount(String weight, int delta) {
    final current = _getCount(weight);
    final next = (current + delta).clamp(0, 99);
    setState(() {
      _counts[weight] = next;
    });
  }

  int get _totalEmptyCount {
    return _counts.values.fold(0, (sum, count) => sum + count);
  }

  String _getSummaryString() {
    final parts = _counts.entries
        .where((e) => e.value > 0)
        .map((e) => '${e.key} \u00D7 ${e.value}')
        .toList();
    return parts.isEmpty ? 'No empties selected' : parts.join(', ');
  }

  @override
  Widget build(BuildContext context) {
    final state = AppStateProvider.of(context);

    // Initialize customer if null
    _selectedCustomer ??= state.customers.isNotEmpty ? state.customers.first : null;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        title: const Text(
          'Collect Empty Cylinders',
          style: TextStyle(
            fontSize: 17,
            fontWeight: FontWeight.w800,
            color: Color(0xFF0F172A),
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE2E8F0), height: 1),
        ),
      ),
      body: _showSuccess ? _buildSuccessView(context) : _buildFormView(state),
    );
  }

  Widget _buildFormView(AppState state) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            physics: const BouncingScrollPhysics(),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. Customer Selector
                _buildCustomerSection(state),

                const SizedBox(height: 20),

                // 2. Section Header: Empty Cylinders by Weight
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          'EMPTY CYLINDERS TO COLLECT',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF94A3B8),
                            letterSpacing: 0.8,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Specify count for each KG weight returned',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                    if (_totalEmptyCount > 0)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFBEB),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Text(
                          '$_totalEmptyCount selected',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFB45309),
                          ),
                        ),
                      ),
                  ],
                ),

                const SizedBox(height: 12),

                // 3. Cylinder Size Items with Steppers
                ...state.cylinders.map((cyl) {
                  final count = _getCount(cyl.weight);
                  final isSelected = count > 0;

                  return Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? const Color(0xFFD97706) : const Color(0xFFE2E8F0),
                        width: isSelected ? 1.5 : 1.0,
                      ),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x04000000),
                          blurRadius: 4,
                          offset: Offset(0, 1.5),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Squircle Icon
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: isSelected
                                ? const Color(0xFFFEF3C7)
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected
                                  ? const Color(0xFFFDE68A)
                                  : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Icon(
                            Icons.propane_tank_outlined,
                            size: 22,
                            color: isSelected
                                ? const Color(0xFFD97706)
                                : const Color(0xFF64748B),
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Cylinder Weight & Details
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    cyl.weight,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF0F172A),
                                      letterSpacing: -0.3,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF1F5F9),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Empty Return',
                                      style: TextStyle(
                                        fontSize: 9.5,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF475569),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(
                                '${cyl.emptyStock} currently on truck',
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: Color(0xFF64748B),
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(width: 8),

                        // Stepper [- QTY +]
                        Container(
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: const Color(0xFFCBD5E1)),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              _stepperButton(
                                icon: Icons.remove_rounded,
                                enabled: count > 0,
                                onTap: () => _updateCount(cyl.weight, -1),
                              ),
                              Container(
                                width: 34,
                                alignment: Alignment.center,
                                child: Text(
                                  '$count',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w900,
                                    color: count > 0
                                        ? const Color(0xFFD97706)
                                        : const Color(0xFF94A3B8),
                                  ),
                                ),
                              ),
                              _stepperButton(
                                icon: Icons.add_rounded,
                                enabled: true,
                                onTap: () => _updateCount(cyl.weight, 1),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ),

        // Bottom Action Bar
        Container(
          padding: const EdgeInsets.fromLTRB(18, 12, 18, 18),
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
            boxShadow: [
              BoxShadow(
                color: Color(0x06000000),
                blurRadius: 8,
                offset: Offset(0, -3),
              ),
            ],
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_totalEmptyCount > 0) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Empties Summary:',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Color(0xFF64748B),
                        ),
                      ),
                      Flexible(
                        child: Text(
                          _getSummaryString(),
                          style: const TextStyle(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFD97706),
                          ),
                          textAlign: TextAlign.right,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: (_selectedCustomer != null && _totalEmptyCount > 0)
                        ? () {
                            final Map<CylinderType, int> batch = {};
                            for (final cyl in state.cylinders) {
                              final count = _getCount(cyl.weight);
                              if (count > 0) {
                                batch[cyl] = count;
                              }
                            }
                            _savedSummary = Map.from(_counts);
                            state.collectEmptyCylindersBatch(_selectedCustomer!, batch);
                            setState(() => _showSuccess = true);
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFDC2626),
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: const Color(0xFFE2E8F0),
                      disabledForegroundColor: const Color(0xFF94A3B8),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Text(
                      _totalEmptyCount > 0
                          ? 'COLLECT $_totalEmptyCount EMPTY CYLINDER${_totalEmptyCount > 1 ? 'S' : ''}'
                          : 'SELECT EMPTY CYLINDERS TO COLLECT',
                      style: const TextStyle(
                        fontSize: 13.5,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // Customer Section
  Widget _buildCustomerSection(AppState state) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'COLLECTING FROM CUSTOMER',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: Color(0xFF94A3B8),
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFCBD5E1)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<Customer>(
              isExpanded: true,
              value: _selectedCustomer,
              icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Color(0xFF64748B)),
              items: state.customers.map((c) {
                return DropdownMenuItem<Customer>(
                  value: c,
                  child: Row(
                    children: [
                      Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.storefront_outlined, size: 16, color: Color(0xFF475569)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              c.name,
                              style: const TextStyle(
                                fontSize: 13.5,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF0F172A),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            Text(
                              '${c.shopId ?? 'Customer'} \u2022 ${c.phone}',
                              style: const TextStyle(
                                fontSize: 10.5,
                                color: Color(0xFF64748B),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() => _selectedCustomer = val);
                }
              },
            ),
          ),
        ),
      ],
    );
  }

  // Stepper +/- Button
  Widget _stepperButton({
    required IconData icon,
    required bool enabled,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: enabled ? onTap : null,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        width: 34,
        height: 34,
        alignment: Alignment.center,
        child: Icon(
          icon,
          size: 17,
          color: enabled ? const Color(0xFF0F172A) : const Color(0xFFCBD5E1),
        ),
      ),
    );
  }

  // Success View
  Widget _buildSuccessView(BuildContext context) {
    final collectedList = _savedSummary.entries.where((e) => e.value > 0).toList();
    final total = collectedList.fold(0, (sum, e) => sum + e.value);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 76,
              height: 76,
              decoration: const BoxDecoration(
                color: Color(0xFFFFFBEB),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.assignment_return_rounded,
                size: 40,
                color: Color(0xFFD97706),
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'Empties Collected!',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: -0.4,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Recorded $total empty cylinder${total > 1 ? 's' : ''} to truck inventory',
              style: const TextStyle(
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
                color: Color(0xFF64748B),
              ),
            ),
            const SizedBox(height: 20),

            // Itemized Breakdown Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'COLLECTED FROM',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF94A3B8),
                          letterSpacing: 0.6,
                        ),
                      ),
                      Text(
                        _selectedCustomer?.name ?? '',
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 20, color: Color(0xFFE2E8F0)),
                  const Text(
                    'ITEMIZED KG BREAKDOWN',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 0.6,
                    ),
                  ),
                  const SizedBox(height: 8),
                  ...collectedList.map((item) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.propane_tank_outlined,
                                size: 14,
                                color: Color(0xFFD97706),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                '${item.key} Cylinder',
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF334155),
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFFFBEB),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Text(
                              '${item.value} empty',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFFB45309),
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),

            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  elevation: 0,
                ),
                child: const Text(
                  'BACK TO INVENTORY',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
