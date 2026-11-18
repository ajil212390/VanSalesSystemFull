import React, { useState, useEffect, useMemo } from 'react';
import { TextInput, Box } from '@mantine/core';
import { IconCalendar } from '@tabler/icons-react';

export const formatDateDDMMYY = (val: string | null | undefined): string => {
  if (!val || val === '—') return '—';
  const str = String(val).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }
  return str;
};

// Helper: Parse any user date string (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.) into ISO 'YYYY-MM-DD'
export const parseToIsoDate = (raw: string): string | null => {
  if (!raw) return null;
  const clean = raw.trim();
  if (!clean) return null;

  // 1. ISO YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const yyyy = isoMatch[1];
    const mm = isoMatch[2].padStart(2, '0');
    const dd = isoMatch[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // 2. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD MM YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{2}|\d{4})$/);
  if (dmyMatch) {
    const dd = dmyMatch[1].padStart(2, '0');
    const mm = dmyMatch[2].padStart(2, '0');
    let yyyy = dmyMatch[3];
    if (yyyy.length === 2) {
      yyyy = `20${yyyy}`;
    }
    return `${yyyy}-${mm}-${dd}`;
  }

  // 3. DD/MM (assume current year)
  const dmMatch = clean.match(/^(\d{1,2})[-/. ](\d{1,2})$/);
  if (dmMatch) {
    const dd = dmMatch[1].padStart(2, '0');
    const mm = dmMatch[2].padStart(2, '0');
    const yyyy = new Date().getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  // 4. Try native Date parse
  const d = new Date(clean);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
};

interface DateInputDDMMYYProps {
  label?: React.ReactNode;
  value: string; // ISO string 'YYYY-MM-DD'
  onChange: (isoDate: string) => void;
  style?: React.CSSProperties;
  placeholder?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  radius?: any;
  required?: boolean;
  styles?: any;
  error?: React.ReactNode;
  disabled?: boolean;
}

export const DateInputDDMMYY: React.FC<DateInputDDMMYYProps> = ({
  label,
  value,
  onChange,
  style,
  placeholder = 'dd/mm/yyyy',
  size = 'sm',
  radius,
  required,
  styles,
  error,
  disabled,
}) => {
  // Convert internal YYYY-MM-DD to DD/MM/YYYY for presentation
  const displayVal = useMemo(() => {
    if (!value) return '';
    const iso = value.split('T')[0];
    const parts = iso.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return value;
  }, [value]);

  const [text, setText] = useState(displayVal);

  useEffect(() => {
    setText(displayVal);
  }, [displayVal]);

  const handleTextChange = (raw: string) => {
    setText(raw);
    const iso = parseToIsoDate(raw);
    if (iso) {
      onChange(iso);
    } else if (!raw.trim()) {
      onChange('');
    }
  };

  const handleBlur = () => {
    if (!text.trim()) {
      onChange('');
      setText('');
      return;
    }
    const iso = parseToIsoDate(text);
    if (iso) {
      onChange(iso);
      const parts = iso.split('-');
      setText(`${parts[2]}/${parts[1]}/${parts[0]}`);
    } else {
      // Revert to current valid value if invalid
      setText(displayVal);
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    if (iso) {
      onChange(iso);
      const parts = iso.split('-');
      if (parts.length === 3) {
        setText(`${parts[2]}/${parts[1]}/${parts[0]}`);
      }
    }
  };

  return (
    <Box style={{ position: 'relative', ...style }}>
      <TextInput
        size={size}
        radius={radius}
        required={required}
        styles={styles}
        error={error}
        disabled={disabled}
        label={label}
        placeholder={placeholder}
        value={text}
        onChange={(e) => handleTextChange(e.currentTarget.value)}
        onBlur={handleBlur}
        rightSection={
          <Box
            style={{
              position: 'relative',
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <IconCalendar size={15} color="#800020" style={{ pointerEvents: 'none' }} />
            {/* Real HTML5 date input transparently overlaid right over the icon */}
            <input
              type="date"
              value={value ? value.split('T')[0] : ''}
              disabled={disabled}
              onChange={handleNativePickerChange}
              title="Click to open calendar"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: disabled ? 'not-allowed' : 'pointer',
                zIndex: 2,
                border: 'none',
                padding: 0,
                margin: 0,
              }}
              tabIndex={-1}
              aria-label="Choose date from calendar"
            />
          </Box>
        }
      />
    </Box>
  );
};


