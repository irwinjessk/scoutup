from django.urls import path

from .views import CCDashboardView, CGDashboardView

app_name = 'activity'

urlpatterns = [
    path('cc/dashboard/', CCDashboardView.as_view(), name='cc-dashboard'),
    path('cg/dashboard/', CGDashboardView.as_view(), name='cg-dashboard'),
]
