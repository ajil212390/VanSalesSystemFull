import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Paper, Title, Text, Button, Stack, Group } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconArrowLeft } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <Paper p="xl" radius="md" withBorder m="md" style={{ backgroundColor: '#ffffff', borderColor: '#fee2e2' }}>
          <Stack gap="md" align="center" ta="center">
            <IconAlertTriangle size={48} color="#dc2626" />
            <Title order={3} style={{ color: '#991b1b' }}>
              {this.props.fallbackTitle || 'Something went wrong displaying this view'}
            </Title>
            <Text size="sm" c="dimmed" style={{ maxWidth: 500 }}>
              {this.state.error?.message || 'An unexpected error occurred while rendering the page component.'}
            </Text>
            <Group gap="sm" mt="sm">
              <Button leftSection={<IconRefresh size={16} />} color="burgundy" onClick={this.handleReset}>
                Reload Page
              </Button>
              <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={this.handleGoHome}>
                Back to Dashboard
              </Button>
            </Group>
          </Stack>
        </Paper>
      );
    }

    return this.props.children;
  }
}
