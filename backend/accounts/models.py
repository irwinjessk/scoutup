from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class Role(models.TextChoices):
    JEUNE = 'JEUNE', 'Jeune (Routier)'
    CC = 'CC', 'Coordinateur de Communauté'
    CG = 'CG', 'Chef de Groupe'


class StatutCompte(models.TextChoices):
    EN_ATTENTE = 'EN_ATTENTE', 'En attente de validation'
    ACTIF = 'ACTIF', 'Actif'
    REFUSE = 'REFUSE', 'Refusé'
    SUSPENDU = 'SUSPENDU', 'Suspendu'


class Genre(models.TextChoices):
    M = 'M', 'Masculin'
    F = 'F', 'Féminin'
    AUTRE = 'AUTRE', 'Autre'


class AuthProvider(models.TextChoices):
    LOCAL = 'LOCAL', 'Local'
    GOOGLE = 'GOOGLE', 'Google'
    TIKTOK = 'TIKTOK', 'TikTok'


class User(AbstractUser):
    """Utilisateur ScoutUp — email comme identifiant de connexion."""

    username = None

    email = models.EmailField('email', unique=True)
    telephone = models.CharField(
        'téléphone',
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        help_text='Numéro au format international E.164 (ex. +2250700000000)',
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    statut = models.CharField(
        max_length=20,
        choices=StatutCompte.choices,
        default=StatutCompte.EN_ATTENTE,
    )
    nom = models.CharField(max_length=80)
    prenoms = models.CharField(max_length=120)
    date_naissance = models.DateField(null=True, blank=True)
    genre = models.CharField(
        max_length=10,
        choices=Genre.choices,
        blank=True,
    )
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)

    groupe = models.ForeignKey(
        'organization.Groupe',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membres',
    )
    communaute = models.ForeignKey(
        'organization.Communaute',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='membres',
    )
    etape_courante = models.ForeignKey(
        'formation.Stage',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='jeunes',
    )
    # Une fois renseigné, le jeune ne peut plus changer seul son placement.
    etape_placee_le = models.DateTimeField(null=True, blank=True)

    valide_par = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='comptes_valides',
    )
    valide_le = models.DateTimeField(null=True, blank=True)

    auth_provider = models.CharField(
        max_length=20,
        choices=AuthProvider.choices,
        default=AuthProvider.LOCAL,
    )
    oauth_id = models.CharField(max_length=120, blank=True, null=True, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom', 'prenoms', 'role']

    class Meta:
        ordering = ['nom', 'prenoms']

    def __str__(self):
        return f'{self.prenoms} {self.nom} ({self.role})'

    @property
    def is_actif(self):
        return self.statut == StatutCompte.ACTIF

    @property
    def nom_complet(self):
        return f'{self.prenoms} {self.nom}'.strip()
