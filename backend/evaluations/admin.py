from django.contrib import admin

from .models import Evaluation, EvaluationAnswer, EvaluationAttempt, EvaluationQuestion


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ('titre', 'communaute', 'statut', 'duree_minutes', 'published_at', 'closes_at')
    list_filter = ('communaute', 'statut')


@admin.register(EvaluationQuestion)
class EvaluationQuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'evaluation', 'type', 'points', 'ordre')
    list_filter = ('type', 'evaluation')


@admin.register(EvaluationAttempt)
class EvaluationAttemptAdmin(admin.ModelAdmin):
    list_display = ('jeune', 'evaluation', 'score', 'score_max', 'present', 'submitted_at')
    list_filter = ('evaluation', 'present')


@admin.register(EvaluationAnswer)
class EvaluationAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question', 'est_correcte', 'points_obtenus')
    list_filter = ('est_correcte',)
