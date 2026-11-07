import os
from django.urls import path, re_path, include
from django.views.static import serve
from django.http import HttpResponse
from django.conf import settings
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

def serve_spa(request):
    dist_index = os.path.join(settings.BASE_DIR, 'frontend', 'dist', 'index.html')
    if os.path.exists(dist_index):
        with open(dist_index, 'rb') as f:
            return HttpResponse(f.read(), content_type='text/html')
    return HttpResponse("Frontend dist not found. Please run 'npm run build' in frontend directory.", status=404)

urlpatterns = [
    # API endpoints (supporting both /api/v1/ and /api/ for maximum resilience)
    path('api/v1/', include('core.urls')),
    path('api/', include('core.urls')),

    # drf-spectacular documentation
    path('api/v1/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/v1/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Static assets for the frontend SPA (assets, images, icons)
    re_path(r'^(?P<path>(assets|favicon\.svg|icons\.svg|login-hero\.jpg).*)$', serve, {
        'document_root': os.path.join(settings.BASE_DIR, 'frontend', 'dist')
    }),

    # SPA catch-all for React frontend routing
    re_path(r'^(?!api/).*$', lambda request: serve_spa(request)),
]
