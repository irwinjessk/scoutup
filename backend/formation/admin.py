from django.contrib import admin

from .models import Certificate, FormationProgress, Question, Stage


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ('titre', 'code', 'ordre', 'communaute', 'actif', 'nb_questions_parcours')
    list_filter = ('communaute', 'code', 'actif')


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('id', 'stage', 'type', 'actif', 'ordre')
    list_filter = ('type', 'actif', 'stage')


@admin.register(FormationProgress)
class FormationProgressAdmin(admin.ModelAdmin):
    list_display = ('jeune', 'stage', 'statut', 'nb_reussies', 'nb_total')
    list_filter = ('statut',)


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    list_display = ('nom_affiche', 'stage', 'couleur', 'delivered_at')
