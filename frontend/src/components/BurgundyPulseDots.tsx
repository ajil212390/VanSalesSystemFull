import React from 'react';
import { Group, Box } from '@mantine/core';

interface BurgundyPulseDotsProps {
  size?: number;
  gap?: number;
}

export const BurgundyPulseDots: React.FC<BurgundyPulseDotsProps> = ({ size = 7, gap = 5 }) => {
  return (
    <Group gap={gap} align="center" style={{ display: 'inline-flex', verticalAlign: 'middle', height: 28, padding: '0 2px' }}>
      {[0, 180, 360].map((delay, idx) => (
        <Box
          key={idx}
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: '#800020',
            animation: 'burgundyPulse 1.2s infinite ease-in-out',
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </Group>
  );
};
