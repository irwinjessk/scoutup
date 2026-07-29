from django.db import models


class Groupe(models.Model):
    nom = models.CharField(max_length=120)
    district = models.CharField(max_length=120, blank=True)
    region = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Communaute(models.Model):
    groupe = models.ForeignKey(
        Groupe,
        on_delete=models.CASCADE,
        related_name='communautes',
    )
    nom = models.CharField(max_length=120)
    branche = models.CharField(max_length=40, default='Route')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom']
        verbose_name = 'Communauté'
        verbose_name_plural = 'Communautés'

    def __str__(self):
        return f'{self.nom} ({self.branche})'
