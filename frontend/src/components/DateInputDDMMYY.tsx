import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TextInput, ActionIcon, Box } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';

export const formatDateDDMMYY = (val: string | null | undefined): string => {
  if (!val || val === '—') return '—';
  const m = String(val).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(val);
};

interface DateInputDDMMYYProps {
  label?: string;
  value: string; // ISO string 'YYYY-MM-DD'
  onChange: (isoDate: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
}

export const DateInputDDMMYY: React.FC<DateInputDDMMYYProps> = ({
  label,
  value,
  onChange,
  style,
  placeholder = 'dd/mm/yyyy',
}) => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  // Convert internal YYYY-MM-DD to DD/MM/YYYY for presentation
  const displayVal = useMemo(() => {
    if (!value) return '';
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  }, [value]);

  const [text, setText] = useState(displayVal);

  useEffect(() => {
    setText(displayVal);
  }, [displayVal]);

  const handleTextChange = (raw: string) => {
    setText(raw);
    const clean = raw.trim();
    // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const match = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (match) {
      const dd = match[1].padStart(2, '0');
      const mm = match[2].padStart(2, '0');
      const yyyy = match[3];
      onChange(`${yyyy}-${mm}-${dd}`);
    } else if (!clean) {
      onChange('');
    }
  };

  const handleOpenPicker = () => {
    if (hiddenInputRef.current) {
      if (typeof hiddenInputRef.current.showPicker === 'function') {
        hiddenInputRef.current.showPicker();
      } else {
        hiddenInputRef.current.focus();
      }
    }
  };

  return (
    <Box style={{ position: 'relative', ...style }}>
      <TextInput
        size="sm"
        label={label}
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleTextChange(e.currentTarget.value)}
        rightSection={
          <ActionIcon
            variant="subtle"
            size="xs"
            color="gray"
            onClick={handleOpenPicker}
            title="Choose Date"
          >
            <IconCalendar size={14} />
          </ActionIcon>
        }
      />
      {/* Hidden browser date input providing native date picker */}
      <input
        ref={hiddenInputRef}
        type="date"
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          border: 'none',
          padding: 0,
          margin: 0,
        }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </Box>
  );
};

