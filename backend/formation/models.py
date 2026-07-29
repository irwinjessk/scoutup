from django.conf import settings
from django.db import models


class StageCode(models.TextChoices):
    NOVICIAT = 'NOVICIAT', 'Noviciat'
    APPRENTISSAGE = 'APPRENTISSAGE', 'Apprentissage'
    COMPAGNONNAGE = 'COMPAGNONNAGE', 'Compagnonnage'
    DEPART_ROUTIER = 'DEPART_ROUTIER', 'Départ Routier'


class QuestionType(models.TextChoices):
    QCM = 'QCM', 'QCM'
    TEXTE_TROUS = 'TEXTE_TROUS', 'Texte à trous'
    REPONSE_DIRECTE = 'REPONSE_DIRECTE', 'Réponse directe'


class ProgressStatut(models.TextChoices):
    EN_COURS = 'EN_COURS', 'En cours'
    VALIDE = 'VALIDE', 'Validé'
    VERROUILLE = 'VERROUILLE', 'Verrouillé'


class Stage(models.Model):
    """Étape de progression Route."""

    communaute = models.ForeignKey(
        'organization.Communaute',
        on_delete=models.CASCADE,
        related_name='stages',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
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


class Question(models.Model):
    """Question de formation libre (Module 1)."""

    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='questions')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='questions_creees',
    )
    type = models.CharField(max_length=20, choices=QuestionType.choices)
    enonce = models.TextField()
    options = models.JSONField(blank=True, null=True)
    reponse_attendue = models.JSONField()
    explication = models.TextField(blank=True)
    actif = models.BooleanField(default=True)
    ordre = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['ordre', 'id']

    def __str__(self):
        return f'Q{self.pk} · {self.stage.code}'


class FormationProgress(models.Model):
    """Progression d'un jeune sur une étape."""

    jeune = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='formations',
    )
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='progressions')
    statut = models.CharField(
        max_length=20,
        choices=ProgressStatut.choices,
        default=ProgressStatut.EN_COURS,
    )
    nb_reussies = models.PositiveSmallIntegerField(default=0)
    nb_total = models.PositiveSmallIntegerField(default=0)
    reponses = models.JSONField(default=list, blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('jeune', 'stage')]
        ordering = ['stage__ordre']

    def __str__(self):
        return f'{self.jeune_id} · {self.stage.code} · {self.statut}'


class Certificate(models.Model):
    """Brevet numérique délivré à la validation d'une étape."""

    id = models.UUIDField(primary_key=True, editable=False)
    jeune = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='brevets',
    )
    stage = models.ForeignKey(Stage, on_delete=models.CASCADE, related_name='brevets')
    nom_affiche = models.CharField(max_length=200)
    fichier = models.FileField(upload_to='brevets/', blank=True)
    couleur = models.CharField(max_length=20)
    delivered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('jeune', 'stage')]
        ordering = ['-delivered_at']

    def __str__(self):
        return f'Brevet {self.stage.code} · {self.nom_affiche}'
