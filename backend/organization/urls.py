from django.urls import path

from .views import CommunauteListView

app_name = 'organization'

urlpatterns = [
    path('communautes/', CommunauteListView.as_view(), name='communaute-list'),
]
