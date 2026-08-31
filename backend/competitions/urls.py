from django.urls import path

from .views import (
    CCCompetitionClassementView,
    CCCompetitionCloseView,
    CCCompetitionDetailView,
    CCCompetitionListCreateView,
    CCCompetitionPublishView,
    CGCompetitionsView,
    CompetitionShareView,
    JeuneCompetitionAnswerView,
    JeuneCompetitionClassementView,
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
    path(
        'cc/competitions/<int:pk>/close/',
        CCCompetitionCloseView.as_view(),
        name='cc-competition-close',
    ),
    path(
        'cc/competitions/<int:pk>/classement/',
        CCCompetitionClassementView.as_view(),
        name='cc-competition-classement',
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
    path(
        'jeune/competitions/<int:pk>/classement/',
        JeuneCompetitionClassementView.as_view(),
        name='jeune-competition-classement',
    ),
    # CG
    path('cg/competitions/', CGCompetitionsView.as_view(), name='cg-competitions'),
    # Public
    path(
        'partage/competitions/<str:token>/',
        CompetitionShareView.as_view(),
        name='competition-share',
    ),
]
