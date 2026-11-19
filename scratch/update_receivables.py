import re

with open('frontend/src/pages/ReceivablesReportPage.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Replace 5 cards and segmented control
start_marker = '{/* 2. Interactive Section Summary Cards */}'
start_idx = content.find(start_marker)
end_marker = '{filteredDebtors.length} Customers Listed'
end_idx = content.find(end_marker)

assert start_idx != -1 and end_idx != -1, f'Markers not found: start={start_idx}, end={end_idx}'

# Find the start of the Badge containing end_marker
badge_start = content.rfind('<Badge', 0, end_idx)
assert badge_start != -1

new_block = """{/* 2. Summary / KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {/* Card 1: Total Debtors */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Debtors
            </Text>
            <IconUsers size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            {debtorsList.length}
          </Text>
          <Text size="xs" c="dimmed">
            Opening Bal: ₹{Math.abs(totalOpeningSum).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {totalOpeningSum >= 0 ? 'Dr' : 'Cr'}
          </Text>
        </Paper>

        {/* Card 2: Total Sales */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Total Sales
            </Text>
            <IconFileInvoice size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalBilledSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            {sales.filter((s: any) => s.Status !== 'CANCELLED').length} delivery &amp; sales bills
          </Text>
        </Paper>

        {/* Card 3: Collections Received */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Collections Received
            </Text>
            <IconCash size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#0f172a', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
            ₹{totalReceivedSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text size="xs" c="dimmed">
            Cleared cash &amp; bank receipts
          </Text>
        </Paper>

        {/* Card 4: Net Balance Receivable */}
        <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <Group justify="space-between" align="center" mb="xs">
            <Text size="xs" fw={700} c="#64748b" tt="uppercase" style={{ letterSpacing: '0.4px', fontSize: 11 }}>
              Net Balance Receivable
            </Text>
            <IconCoins size={20} color="#800020" stroke={1.75} />
          </Group>
          <Text fw={700} style={{ color: '#800020', fontSize: 26, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', marginBottom: 4 }}>
            ₹{Math.abs(totalReceivableSum).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
            <Text component="span" size="sm" fw={700} c="#800020">
              {totalReceivableSum >= 0 ? 'Dr' : 'Cr'}
            </Text>
          </Text>
          <Text size="xs" c="dimmed">
            Current outstanding from customers
          </Text>
        </Paper>
      </SimpleGrid>

      {/* 3. Debtors Table Container */}
      <Paper radius="md" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Table Filter Toolbar */}
        <Group justify="space-between" align="center" p="md" style={{ borderBottom: '1px solid #f1f5f9' }} wrap="wrap" gap="sm">
          <Group gap="sm" style={{ flexGrow: 1 }} wrap="wrap">
            <TextInput
              placeholder="Search customer name, phone, city..."
              size="sm"
              radius="md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.currentTarget.value)}
              leftSection={<IconSearch size={15} color="#64748b" />}
              rightSection={searchQuery ? <CloseButton size="xs" onClick={() => setSearchQuery('')} /> : null}
              style={{ minWidth: 260, maxWidth: 360 }}
            />

            {/* Defaulters, Regular, Overdue & Empty Limit Section Tabs */}
            <SegmentedControl
              value={debtorFilter}
              onChange={(v: any) => setDebtorFilter(v)}
              color="burgundy"
              radius="xl"
              size="xs"
              styles={{
                root: {
                  backgroundColor: '#f1f5f9',
                  padding: 3,
                  border: '1px solid #e2e8f0',
                  boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
                },
                indicator: {
                  boxShadow: '0 2px 4px rgba(128, 0, 32, 0.25)',
                  borderRadius: 9999,
                },
                label: {
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '5px 14px',
                  transition: 'color 150ms ease',
                },
              }}
              data={[
                { label: `All (${debtorsList.length})`, value: 'ALL' },
                { label: `Regular (${regularCount})`, value: 'REGULAR' },
                { label: `Defaulters (${deliveryOverdueCount})`, value: 'DEFAULTERS' },
                { label: `Overdue Bills (${overdueBillsCount})`, value: 'OVERDUE_BILLS' },
                { label: `Empty Limit Exceeded (${emptyLimitExceededCount})`, value: 'EMPTY_LIMIT' },
              ]}
            />
          </Group>

          """

content = content[:start_idx] + new_block + content[badge_start:]

# Replace DELIVERY_OVERDUE with DEFAULTERS in headers, body, footer
content = content.replace(") : debtorFilter === 'DELIVERY_OVERDUE' ? (", ") : debtorFilter === 'DEFAULTERS' ? (")

# Replace Customer Name badges in table body
old_badges = """                          {debtor.isBillOverdue && (
                            <Badge size="xs" variant="filled" color="red">
                              Bill Overdue {debtor.billOverdueDays}d
                            </Badge>
                          )}
                          {debtor.isDeliveryOverdue && !debtor.isBillOverdue && (
                            <Badge size="xs" variant="light" color="orange" style={{ fontWeight: 600 }}>
                              Refill Due {debtor.deliveryOverdueDays}d
                            </Badge>
                          )}"""

new_badges = """                          {debtor.isBillOverdue && (
                            <Badge
                              size="xs"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#fdf2f4',
                                  color: '#800020',
                                  borderColor: '#f5c2cb',
                                  fontWeight: 600,
                                },
                              }}
                            >
                              Bill Overdue {debtor.billOverdueDays}d
                            </Badge>
                          )}
                          {debtor.isDeliveryOverdue && (
                            <Badge
                              size="xs"
                              variant="light"
                              styles={{
                                root: {
                                  backgroundColor: '#fdf2f4',
                                  color: '#800020',
                                  borderColor: '#f5c2cb',
                                  fontWeight: 600,
                                },
                              }}
                            >
                              Overdue {debtor.deliveryOverdueDays}d
                            </Badge>
                          )}"""

content = content.replace(old_badges, new_badges)

# Replace table body colors for Empty Limit, Overdue Bills, Defaulters
content = content.replace('<Badge size="sm" variant="light" color="blue" fw={700}>', '<Badge size="sm" variant="light" color="gray" fw={700}>')
content = content.replace('<Badge size="sm" variant="filled" color="burgundy" fw={800}>', "<Badge size=\"sm\" variant=\"light\" styles={{ root: { backgroundColor: '#fdf2f4', color: '#800020', fontWeight: 700 } }}>")
content = content.replace('<Badge size="sm" variant="filled" color="red" fw={700}>', "<Badge size=\"sm\" variant=\"light\" styles={{ root: { backgroundColor: '#fdf2f4', color: '#800020', fontWeight: 700 } }}>")
content = content.replace("color: '#e11d48', fontVariantNumeric: 'tabular-nums'", "color: '#800020', fontVariantNumeric: 'tabular-nums'")
content = content.replace('<Badge size="xs" variant="outline" color="teal">', '<Badge size="xs" variant="outline" color="gray">')
content = content.replace('<Badge size="sm" variant="filled" color="orange" fw={700}>', "<Badge size=\"sm\" variant=\"light\" styles={{ root: { backgroundColor: '#fdf2f4', color: '#800020', fontWeight: 700 } }}>")

# Replace footer colors
content = content.replace("color: '#0284c7' }}>", "color: '#0f172a' }}>")
content = content.replace("color: '#e11d48' }}>", "color: '#800020' }}>")
content = content.replace("color: '#d97706' }}>", "color: '#800020' }}>")
content = content.replace('{deliveryOverdueCount} Customers Due for Refill Cycle', '{deliveryOverdueCount} Overdue Defaulter Customers')

with open('frontend/src/pages/ReceivablesReportPage.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully updated ReceivablesReportPage.tsx')
