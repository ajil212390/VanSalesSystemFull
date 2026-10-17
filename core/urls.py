from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import (
    LoginView, MeView,
    CompanyProfileView, StateListView, RoleListView,
    DriverViewSet, VehicleViewSet, RouteViewSet, RouteVehicleDriverViewSet,UserViewSet
)


router = DefaultRouter()
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'vehicles', VehicleViewSet, basename='vehicle')
router.register(r'routes', RouteViewSet, basename='route')
router.register(r'allocations', RouteVehicleDriverViewSet, basename='allocation')
router.register(r'users', UserViewSet, basename='user')



urlpatterns = [
    # Authentication endpoints
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/me/', MeView.as_view(), name='auth-me'),

    # Company Profile
    path('company/', CompanyProfileView.as_view(), name='company-profile'),

    # Public and Supporting endpoints
    path('states/', StateListView.as_view(), name='states-list'),
    path('roles/', RoleListView.as_view(), name='roles-list'),
    path ('', include(router.urls)),
]
