from django.urls import path

from .views import (
    CCQuestionDetailView,
    CCStageDetailView,
    CCStageListCreateView,
    CCStageQuestionsView,
    CGFormationsView,
    JeuneBrevetDownloadView,
    JeuneBrevetsView,
    JeuneFormationAnswerView,
    JeuneFormationNextQuestionView,
    JeuneFormationOverviewView,
    JeuneFormationStartView,
    JeuneFoulardView,
)

app_name = 'formation'

urlpatterns = [
    # CC
    path('cc/stages/', CCStageListCreateView.as_view(), name='cc-stages'),
    path('cc/stages/<int:pk>/', CCStageDetailView.as_view(), name='cc-stage-detail'),
    path(
        'cc/stages/<int:pk>/questions/',
        CCStageQuestionsView.as_view(),
        name='cc-stage-questions',
    ),
    path('cc/questions/<int:pk>/', CCQuestionDetailView.as_view(), name='cc-question-detail'),
    # Jeune
    path('jeune/formation/', JeuneFormationOverviewView.as_view(), name='jeune-formation'),
    path('jeune/formation/start/', JeuneFormationStartView.as_view(), name='jeune-formation-start'),
    path(
        'jeune/formation/next-question/',
        JeuneFormationNextQuestionView.as_view(),
        name='jeune-formation-next',
    ),
    path(
        'jeune/formation/answer/',
        JeuneFormationAnswerView.as_view(),
        name='jeune-formation-answer',
    ),
    path('jeune/foulard/', JeuneFoulardView.as_view(), name='jeune-foulard'),
    path('jeune/brevets/', JeuneBrevetsView.as_view(), name='jeune-brevets'),
    path(
        'jeune/brevets/<uuid:pk>/download/',
        JeuneBrevetDownloadView.as_view(),
        name='jeune-brevet-download',
    ),
    # CG
    path('cg/formations/', CGFormationsView.as_view(), name='cg-formations'),
]
