from django.conf import settings
from django.db import models

from formation.models import QuestionType


class EvaluationStatut(models.TextChoices):
    BROUILLON = 'BROUILLON', 'Brouillon'
    OUVERTE = 'OUVERTE', 'Ouverte'
    CLOTUREE = 'CLOTUREE', 'Clôturée'


class Evaluation(models.Model):
    """Évaluation surveillée d'une réunion — fait aussi office de liste de présence."""

    communaute = models.ForeignKey(
        'organization.Communaute',
        on_delete=models.CASCADE,
        related_name='evaluations',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evaluations_creees',
    )
    titre = models.CharField(max_length=160)
    duree_minutes = models.PositiveSmallIntegerField()
    statut = models.CharField(
        max_length=20,
        choices=EvaluationStatut.choices,
        default=EvaluationStatut.BROUILLON,
    )
    published_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.titre} ({self.statut})'


class EvaluationQuestion(models.Model):
    """Question d'évaluation — même schéma que formation.Question, table séparée."""

    evaluation = models.ForeignKey(
        Evaluation,
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
        return f'Q{self.pk} · {self.evaluation.titre}'


class EvaluationAttempt(models.Model):
    """Participation d'un jeune à une évaluation = preuve de présence à la réunion."""

    evaluation = models.ForeignKey(
        Evaluation,
        on_delete=models.CASCADE,
        related_name='attempts',
    )
    jeune = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='evaluation_attempts',
    )
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    score_max = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    present = models.BooleanField(default=True)
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [('evaluation', 'jeune')]
        ordering = ['-started_at']

    def __str__(self):
        return f'{self.jeune_id} · {self.evaluation.titre}'


class EvaluationAnswer(models.Model):
    """Réponse notée côté serveur à une question d'évaluation."""

    attempt = models.ForeignKey(
        EvaluationAttempt,
        on_delete=models.CASCADE,
        related_name='reponses',
    )
    question = models.ForeignKey(
        EvaluationQuestion,
        on_delete=models.CASCADE,
        related_name='reponses',
    )
    reponse = models.JSONField()
    est_correcte = models.BooleanField(null=True, blank=True)
    points_obtenus = models.PositiveSmallIntegerField(default=0)

    class Meta:
        unique_together = [('attempt', 'question')]

    def __str__(self):
        return f'{self.attempt_id} · Q{self.question_id}'
