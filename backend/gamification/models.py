from django.conf import settings
from django.db import models


class ScarfState(models.Model):
    """
    État foulard d'un jeune.
    3 foulards = 6 moitiés. Pas d'images : uniquement compteur + horodatages.
    """

    jeune = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='foulard',
    )
    moities_perdues = models.PositiveSmallIntegerField(default=0)
    recovery_at = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'état foulard'
        verbose_name_plural = 'états foulard'

    def __str__(self):
        return f'Foulard {self.jeune_id} · perdues={self.moities_perdues}'

    @property
    def moities_restantes(self):
        return max(0, 6 - self.moities_perdues)

    @property
    def foulards_restants(self):
        return self.moities_restantes / 2
