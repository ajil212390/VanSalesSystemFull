import type { UseFormSetError, FieldValues, Path } from 'react-hook-form';

export const setServerErrors = <T extends FieldValues>(
  setError: UseFormSetError<T>,
  errors: Record<string, string[] | string>
) => {
  Object.entries(errors).forEach(([field, messages]) => {
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (field === 'non_field_errors' || field === 'detail') {
      setError('root' as Path<T>, { type: 'server', message });
    } else {
      setError(field as Path<T>, { type: 'server', message });
    }
  });
};
