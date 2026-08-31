from django.conf import settings
from django.db import models

from formation.models import QuestionType


class CompetitionStatut(models.TextChoices):
    BROUILLON = 'BROUILLON', 'Brouillon'
    OUVERTE = 'OUVERTE', 'Ouverte'
    CLOTUREE = 'CLOTUREE', 'Clôturée'


class Competition(models.Model):
    """Compétition Génie Route entre routiers d'une même communauté."""

    communaute = models.ForeignKey(
        'organization.Communaute',
        on_delete=models.CASCADE,
        related_name='competitions',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='competitions_creees',
    )
    titre = models.CharField(max_length=160)
    duree_jours = models.PositiveSmallIntegerField(default=2)
    statut = models.CharField(
        max_length=20,
        choices=CompetitionStatut.choices,
        default=CompetitionStatut.BROUILLON,
    )
    partage_token = models.CharField(max_length=32, unique=True, null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.titre} ({self.statut})'


class CompetitionQuestion(models.Model):
    """Question de la banque d'une compétition — même schéma que formation.Question."""

    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name='questions',
    )
    type = models.CharField(max_length=20, choices=QuestionType.choices)
    enonce = models.TextField()
    options = models.JSONField(blank=True, null=True)
    reponse_attendue = models.JSONField()
    points = models.PositiveSmallIntegerField(default=1)
    ordre = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['ordre', 'id']

    def __str__(self):
        return f'Q{self.pk} · {self.competition.titre}'


class CompetitionAttempt(models.Model):
    """Participation d'un jeune à une compétition — score cumulé sur la durée de l'épreuve."""

    competition = models.ForeignKey(
        Competition,
        on_delete=models.CASCADE,
        related_name='attempts',
    )
    jeune = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='competition_attempts',
    )
    score = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('competition', 'jeune')]
        ordering = ['-score', 'updated_at']

    def __str__(self):
        return f'{self.jeune_id} · {self.competition.titre}'


class CompetitionAnswer(models.Model):
    """Réponse notée côté serveur à une question de compétition."""

    attempt = models.ForeignKey(
        CompetitionAttempt,
        on_delete=models.CASCADE,
        related_name='reponses',
    )
    question = models.ForeignKey(
        CompetitionQuestion,
        on_delete=models.CASCADE,
        related_name='reponses',
    )
    reponse = models.JSONField()
    est_correcte = models.BooleanField(default=False)
    points_obtenus = models.PositiveSmallIntegerField(default=0)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('attempt', 'question')]

    def __str__(self):
        return f'{self.attempt_id} · Q{self.question_id}'
