from django.db import models


class StageCode(models.TextChoices):
    NOVICIAT = 'NOVICIAT', 'Noviciat'
    APPRENTISSAGE = 'APPRENTISSAGE', 'Apprentissage'
    COMPAGNONNAGE = 'COMPAGNONNAGE', 'Compagnonnage'
    DEPART_ROUTIER = 'DEPART_ROUTIER', 'Départ Routier'


class Stage(models.Model):
    """Étape de progression Route — modèle socle minimal (contenu enrichi en Module 1)."""

    communaute = models.ForeignKey(
        'organization.Communaute',
        on_delete=models.CASCADE,
        related_name='stages',
    )
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='stages_crees',
    )
    code = models.CharField(max_length=30, choices=StageCode.choices)
    ordre = models.PositiveSmallIntegerField()
    titre = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    couleur_brevet = models.CharField(max_length=20)
    modele_brevet = models.CharField(max_length=255, blank=True)
    nb_questions_parcours = models.PositiveSmallIntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordre']
        unique_together = [('communaute', 'code'), ('communaute', 'ordre')]

    def __str__(self):
        return f'{self.titre} ({self.communaute})'
