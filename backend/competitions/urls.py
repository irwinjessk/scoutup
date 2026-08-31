from django.urls import path

from .views import CCCompetitionDetailView, CCCompetitionListCreateView, CCCompetitionPublishView

app_name = 'competitions'

urlpatterns = [
    # CC
    path('cc/competitions/', CCCompetitionListCreateView.as_view(), name='cc-competitions'),
    path(
        'cc/competitions/<int:pk>/',
        CCCompetitionDetailView.as_view(),
        name='cc-competition-detail',
    ),
    path(
        'cc/competitions/<int:pk>/publish/',
        CCCompetitionPublishView.as_view(),
        name='cc-competition-publish',
    ),
]
