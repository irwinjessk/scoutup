from django.urls import path

from .views import (
    CCEvaluationCloseView,
    CCEvaluationDetailView,
    CCEvaluationListCreateView,
    CCEvaluationParticipantDetailView,
    CCEvaluationPublishView,
    CCEvaluationResultsView,
    CCPresencesView,
    CGEvaluationsView,
    JeuneEvaluationAttemptDetailView,
    JeuneEvaluationJoinView,
    JeuneEvaluationListView,
    JeuneEvaluationQuestionsView,
    JeuneEvaluationSubmitView,
)

app_name = 'evaluations'

urlpatterns = [
    # CC
    path('cc/evaluations/', CCEvaluationListCreateView.as_view(), name='cc-evaluations'),
    path('cc/evaluations/<int:pk>/', CCEvaluationDetailView.as_view(), name='cc-evaluation-detail'),
    path(
        'cc/evaluations/<int:pk>/publish/',
        CCEvaluationPublishView.as_view(),
        name='cc-evaluation-publish',
    ),
    path(
        'cc/evaluations/<int:pk>/close/',
        CCEvaluationCloseView.as_view(),
        name='cc-evaluation-close',
    ),
    path(
        'cc/evaluations/<int:pk>/results/',
        CCEvaluationResultsView.as_view(),
        name='cc-evaluation-results',
    ),
    path(
        'cc/evaluations/<int:pk>/participants/<int:jeune_id>/',
        CCEvaluationParticipantDetailView.as_view(),
        name='cc-evaluation-participant-detail',
    ),
    path('cc/presences/', CCPresencesView.as_view(), name='cc-presences'),
    # Jeune
    path('jeune/evaluations/', JeuneEvaluationListView.as_view(), name='jeune-evaluations'),
    path(
        'jeune/evaluations/attempts/<int:attempt_id>/',
        JeuneEvaluationAttemptDetailView.as_view(),
        name='jeune-evaluation-attempt-detail',
    ),
    path(
        'jeune/evaluations/<int:pk>/join/',
        JeuneEvaluationJoinView.as_view(),
        name='jeune-evaluation-join',
    ),
    path(
        'jeune/evaluations/<int:pk>/questions/',
        JeuneEvaluationQuestionsView.as_view(),
        name='jeune-evaluation-questions',
    ),
    path(
        'jeune/evaluations/<int:pk>/submit/',
        JeuneEvaluationSubmitView.as_view(),
        name='jeune-evaluation-submit',
    ),
    # CG
    path('cg/evaluations/', CGEvaluationsView.as_view(), name='cg-evaluations'),
]
