from django.urls import path

from .views import (
    CCCompetitionDetailView,
    CCCompetitionListCreateView,
    CCCompetitionPublishView,
    JeuneCompetitionAnswerView,
    JeuneCompetitionJoinView,
    JeuneCompetitionListView,
    JeuneCompetitionQuestionView,
)

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
    # Jeune
    path('jeune/competitions/', JeuneCompetitionListView.as_view(), name='jeune-competitions'),
    path(
        'jeune/competitions/<int:pk>/join/',
        JeuneCompetitionJoinView.as_view(),
        name='jeune-competition-join',
    ),
    path(
        'jeune/competitions/<int:pk>/question/',
        JeuneCompetitionQuestionView.as_view(),
        name='jeune-competition-question',
    ),
    path(
        'jeune/competitions/<int:pk>/repondre/',
        JeuneCompetitionAnswerView.as_view(),
        name='jeune-competition-answer',
    ),
]
