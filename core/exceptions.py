from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated


class ServiceError(Exception):
    """Business logic error raised by service functions."""
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


def custom_exception_handler(exc, context):
    """
    Standardize all API error responses into:
    {
        "field_name": ["Error message 1", ...],
        "non_field_errors": ["Error message"]
    }
    """
    # Call DRF's default exception handler first to get the standard error response
    response = exception_handler(exc, context)

    # Handle custom ServiceError
    if isinstance(exc, ServiceError):
        field = exc.field or 'non_field_errors'
        return Response({field: [exc.message]}, status=status.HTTP400_BAD_REQUEST)

    # If DRF handled it, format its response into our unified format
    if response is not None:
        formatted_data = {}

        # Handle 401 Authentication failure (e.g., login failure or invalid token)
        if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            # Per spec: Any login/auth failure returns "Invalid login details" or token expired
            msg = str(response.data.get('detail', 'Invalid login details'))
            if 'No active account' in msg or 'credentials' in msg.lower():
                msg = 'Invalid login details'
            formatted_data = {'non_field_errors': [msg]}
            response.data = formatted_data
            return response

        # Standard field errors or lists
        if isinstance(response.data, dict):
            for key, val in response.data.items():
                if isinstance(val, list):
                    formatted_data[key] = [str(item) for item in val]
                elif isinstance(val, dict):
                    formatted_data[key] = [f"{k}: {v}" for k, v in val.items()]
                else:
                    if key == 'detail':
                        formatted_data['non_field_errors'] = [str(val)]
                    else:
                        formatted_data[key] = [str(val)]
        elif isinstance(response.data, list):
            formatted_data['non_field_errors'] = [str(item) for item in response.data]
        else:
            formatted_data['non_field_errors'] = [str(response.data)]

        response.data = formatted_data

    return response
