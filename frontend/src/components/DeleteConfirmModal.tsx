import React from 'react';
import { Modal, Text, Group, Button, Stack } from '@mantine/core';

interface DeleteConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  itemName?: string;
  itemType?: string;
  loading?: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  opened,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  itemName,
  itemType = 'record',
  loading = false,
}) => {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} style={{ color: '#800020', fontSize: '1rem' }}>
          {title}
        </Text>
      }
      centered
      radius="sm"
      overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
      styles={{
        header: {
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '12px',
        },
      }}
    >
      <Stack gap="md" pt="xs">
        <Text size="sm" c="#334155" style={{ lineHeight: 1.5 }}>
          Are you sure you want to delete {itemType} {itemName ? <strong style={{ color: '#0f172a' }}>"{itemName}"</strong> : 'this record'}?
          This action cannot be undone.
        </Text>

        <Group justify="flex-end" gap="xs" mt="sm">
          <Button variant="default" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button color="burgundy" size="sm" onClick={onConfirm} loading={loading}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
