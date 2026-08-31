from django.contrib import admin

from .models import Competition, CompetitionAnswer, CompetitionAttempt, CompetitionQuestion


@admin.register(Competition)
class CompetitionAdmin(admin.ModelAdmin):
    list_display = ('titre', 'communaute', 'statut', 'duree_jours', 'published_at', 'closes_at')
    list_filter = ('communaute', 'statut')


@admin.register(CompetitionQuestion)
class CompetitionQuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'competition', 'type', 'points', 'ordre')
    list_filter = ('type', 'competition')


@admin.register(CompetitionAttempt)
class CompetitionAttemptAdmin(admin.ModelAdmin):
    list_display = ('jeune', 'competition', 'score', 'started_at', 'updated_at')
    list_filter = ('competition',)


@admin.register(CompetitionAnswer)
class CompetitionAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question', 'est_correcte', 'points_obtenus', 'answered_at')
    list_filter = ('est_correcte',)
