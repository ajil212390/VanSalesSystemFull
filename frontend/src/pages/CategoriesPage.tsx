import React, { useState, useMemo } from 'react';
import {
  Title,
  Paper,
  TextInput,
  Select,
  Button,
  Group,
  Stack,
  Table,
  Badge,
  Loader,
  Center,
  Text,
  Collapse,
  SimpleGrid,
  CloseButton,
  Switch,
  ActionIcon,
  Box,
  Transition,
  Tooltip,
} from '@mantine/core';
import { IconPencil, IconTrash, IconSearch } from '@tabler/icons-react';
import { useForm, Controller } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@mantine/notifications';
import { apiClient } from '../api/client';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';

interface CategoryItem {
  CategoryId: number;
  CategoryName: string;
  ParentCategory: number | null;
  parent_category_name?: string | null;
  IsActive: boolean;
  CreatedAt: string;
  CompanyId: number;
  delete_block_reason?: string | null;
}

interface CategoryFormValues {
  CategoryName: string;
  ParentCategory: string | null;
  IsActive: boolean;
}

export const CategoriesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [formOpened, setFormOpened] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Categories list
  const { data: categories = [], isLoading } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get<any>('/categories/');
      return Array.isArray(res.data) ? res.data : (res.data?.results || []);
    },
  });

  // Client-side search filter
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter((c) =>
      (c.CategoryName && c.CategoryName.toLowerCase().includes(q)) ||
      (c.parent_category_name && c.parent_category_name.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // Options for Parent Category dropdown (exclude current editing category to prevent self-parenting)
  const parentOptions = useMemo(() => {
    return categories
      .filter((c) => !editingCategory || c.CategoryId !== editingCategory.CategoryId)
      .map((c) => ({
        value: String(c.CategoryId),
        label: c.parent_category_name
          ? `${c.CategoryName} (under ${c.parent_category_name})`
          : `${c.CategoryName} [Main Category]`,
      }));
  }, [categories, editingCategory]);

  // 2. Form state
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: {
      CategoryName: '',
      ParentCategory: null,
      IsActive: true,
    },
  });

  // 3. Mutation to create or edit category
  const saveMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const payload: any = {
        CategoryName: data.CategoryName.trim(),
        ParentCategory: data.ParentCategory ? Number(data.ParentCategory) : null,
        IsActive: data.IsActive,
      };

      if (editingCategory) {
        return apiClient.patch(`/categories/${editingCategory.CategoryId}/`, payload);
      }
      return apiClient.post('/categories/', payload);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: editingCategory ? 'Category updated successfully.' : 'Category created successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      reset();
      setEditingCategory(null);
      setFormOpened(false);
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.CategoryName?.[0] ||
        err.response?.data?.ParentCategory?.[0] ||
        err.response?.data?.detail ||
        'Failed to save category.';
      notifications.show({
        title: 'Error',
        message: msg,
        color: 'red',
      });
    },
  });

  const onSubmit = (values: CategoryFormValues) => {
    saveMutation.mutate(values);
  };

  // 4. Mutation to delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.delete(`/categories/${id}/`);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Deleted',
        message: 'Category deleted successfully.',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Failed to delete category.';
      notifications.show({
        title: 'Cannot Delete',
        message: msg,
        color: 'red',
      });
    },
  });

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id, {
        onSettled: () => setDeleteTarget(null),
      });
    }
  };

  // Helper: start editing category
  const handleEdit = (category: CategoryItem) => {
    setEditingCategory(category);
    reset({
      CategoryName: category.CategoryName || '',
      ParentCategory: category.ParentCategory ? String(category.ParentCategory) : null,
      IsActive: category.IsActive,
    });
    setFormOpened(true);
  };

  // Helper: start adding new category
  const handleAddNew = () => {
    if (formOpened && !editingCategory) {
      setFormOpened(false);
      return;
    }
    setEditingCategory(null);
    reset({
      CategoryName: '',
      ParentCategory: null,
      IsActive: true,
    });
    setFormOpened(true);
  };

  return (
    <Stack gap="lg">
      {/* Page Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Title order={2} style={{ color: '#800020', fontWeight: 700 }}>
            Categories
          </Title>
          <Text size="sm" c="dimmed">
            Manage product categories, sub-classifications, and cylinder groups.
          </Text>
        </div>

        {/* Right Actions: Search Bar + Add Category Button */}
        <Group gap="sm" align="center" wrap="nowrap">
          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(searchStyles) => (
              <Box style={{ ...searchStyles, width: 280 }}>
                <TextInput
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} stroke={1.5} color="#800020" />}
                  rightSection={
                    searchQuery ? (
                      <CloseButton
                        size="sm"
                        aria-label="Clear search"
                        onClick={() => setSearchQuery('')}
                      />
                    ) : null
                  }
                  radius="md"
                  size="sm"
                />
              </Box>
            )}
          </Transition>

          <Transition mounted={!formOpened} transition="fade" duration={200}>
            {(btnStyles) => (
              <Button color="burgundy" radius={10} onClick={handleAddNew} style={btnStyles}>
                + Add Category
              </Button>
            )}
          </Transition>
        </Group>
      </Group>

      {/* Seamless Form & Table Container */}
      <Box>
        {/* Smooth Slide-Down Form Panel */}
        <Collapse expanded={formOpened} transitionDuration={250} transitionTimingFunction="ease">
          <Paper
            p="lg"
            radius="sm"
            withBorder
            style={{
              backgroundColor: '#ffffff',
              borderColor: '#f5c2cb',
              borderLeft: '4px solid #800020',
            }}
          >
            <Group justify="space-between" align="flex-start" mb="md">
              <div>
                <Text fw={700} style={{ color: '#800020' }}>
                  {editingCategory ? `Edit Category: ${editingCategory.CategoryName}` : 'New Category Details'}
                </Text>
                <Text size="xs" c="dimmed">
                  {editingCategory
                    ? 'Update category name, parent category classification, and active status.'
                    : 'Specify category name and optionally select a parent category for sub-grouping.'}
                </Text>
              </div>
              <CloseButton
                size="md"
                onClick={() => {
                  setFormOpened(false);
                  setEditingCategory(null);
                }}
              />
            </Group>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Stack gap="md">
                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                  <TextInput
                    label="Category Name"
                    placeholder="e.g. Commercial Cylinders, 19 KG, Valves"
                    required
                    {...register('CategoryName', { required: 'Category name is required' })}
                    error={errors.CategoryName?.message}
                  />

                  <Controller
                    name="ParentCategory"
                    control={control}
                    render={({ field }) => (
                      <Select
                        label="Parent Category (Optional)"
                        placeholder="Leave empty for Main Category"
                        data={parentOptions}
                        value={field.value}
                        onChange={field.onChange}
                        clearable
                        searchable
                        nothingFoundMessage="No parent categories found"
                      />
                    )}
                  />
                </SimpleGrid>

                <Group justify="space-between" align="center" wrap="wrap" gap="md" mt="xs">
                  <Controller
                    name="IsActive"
                    control={control}
                    render={({ field }) => (
                      <Paper p="xs" px="sm" radius="sm" withBorder style={{ backgroundColor: '#fcfcfc', borderColor: '#e2e8f0' }}>
                        <Switch
                          label={field.value ? 'Category Status: Active' : 'Category Status: Inactive'}
                          description={field.value ? 'Visible in product creation & catalog' : 'Disabled and hidden from catalog'}
                          checked={field.value}
                          onChange={(e) => field.onChange(e.currentTarget.checked)}
                          color="burgundy"
                          size="sm"
                        />
                      </Paper>
                    )}
                  />

                  <Group gap="sm">
                    <Button
                      variant="default"
                      onClick={() => {
                        setFormOpened(false);
                        setEditingCategory(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      color="burgundy"
                      loading={isSubmitting || saveMutation.isPending}
                    >
                      {editingCategory ? 'Save Changes' : 'Create Category'}
                    </Button>
                  </Group>
                </Group>
              </Stack>
            </form>
          </Paper>
        </Collapse>

        {/* Animated Categories Table */}
        <Transition mounted={!formOpened} transition="fade" duration={250} timingFunction="ease">
          {(styles) => (
            <Paper
              radius="sm"
              withBorder
              style={{
                ...styles,
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              {isLoading ? (
                <Center p="xl">
                  <Loader color="burgundy" />
                </Center>
              ) : categories.length === 0 ? (
                <Center p="xl">
                  <Text c="dimmed" size="sm">
                    No categories created yet. Click "+ Add Category" above to create your first category.
                  </Text>
                </Center>
              ) : filteredCategories.length === 0 ? (
                <Center p="xl">
                  <Stack align="center" gap="xs">
                    <Text c="dimmed" size="sm">
                      No categories match "{searchQuery}".
                    </Text>
                    <Button variant="subtle" size="xs" color="burgundy" onClick={() => setSearchQuery('')}>
                      Clear Search
                    </Button>
                  </Stack>
                </Center>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Category Name</Table.Th>
                      <Table.Th>Level / Classification</Table.Th>
                      <Table.Th>Parent Category</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {filteredCategories.map((c) => (
                      <Table.Tr key={c.CategoryId}>
                        <Table.Td style={{ fontWeight: 600 }}>{c.CategoryName}</Table.Td>
                        <Table.Td>
                          {c.ParentCategory ? (
                            <Badge size="sm" variant="dot" color="gray">
                              Sub-Category
                            </Badge>
                          ) : (
                            <Badge size="sm" variant="light" color="burgundy" style={{ backgroundColor: '#fdf2f4', color: '#800020' }}>
                              Main Category
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {c.parent_category_name ? (
                            <Text size="sm" fw={500} c="#334155">
                              {c.parent_category_name}
                            </Text>
                          ) : (
                            <Text size="sm" c="dimmed">
                              — (Root)
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="outline"
                            style={{
                              borderColor: c.IsActive ? '#cbd5e1' : '#fca5a5',
                              color: c.IsActive ? '#334155' : '#dc2626',
                              backgroundColor: c.IsActive ? '#f8fafc' : '#fff5f5',
                              fontWeight: 500,
                            }}
                          >
                            {c.IsActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'right' }}>
                          <Group gap={4} justify="flex-end" wrap="nowrap">
                            <ActionIcon
                              variant="subtle"
                              color="burgundy"
                              size="sm"
                              title="Edit Category"
                              onClick={() => handleEdit(c)}
                            >
                              <IconPencil size={16} />
                            </ActionIcon>
                            <Tooltip
                              label={c.delete_block_reason || 'Delete Category'}
                              withArrow
                              position="top"
                            >
                              <span>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  disabled={!!c.delete_block_reason}
                                  style={{
                                    cursor: c.delete_block_reason ? 'not-allowed' : 'pointer',
                                    opacity: c.delete_block_reason ? 0.35 : 1,
                                  }}
                                  onClick={() => {
                                    if (!c.delete_block_reason) {
                                      setDeleteTarget({ id: c.CategoryId, name: c.CategoryName });
                                    }
                                  }}
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </span>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          )}
        </Transition>
      </Box>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        opened={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Category"
        itemType="category"
        itemName={deleteTarget?.name}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </Stack>
  );
};
