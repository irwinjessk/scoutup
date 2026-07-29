from django.conf import settings
from django.db.models.signals import post_migrate
from django.dispatch import receiver


@receiver(post_migrate)
def seed_default_cg(sender, **kwargs):
    """Crée le CG, le groupe et la communauté de démo (phase de test)."""
    if sender.name != 'accounts':
        return

    from organization.models import Communaute, Groupe

    from .models import Role, StatutCompte, User

    email = getattr(settings, 'DEFAULT_CG_EMAIL', 'cg@scoutup.local')

    groupe, _ = Groupe.objects.get_or_create(
        nom='Groupe MAMA',
        defaults={
            'district': 'Les Mayas',
            'region': 'Yopougon',
        },
    )
    Communaute.objects.get_or_create(
        groupe=groupe,
        nom='Félix Houphouët-Boigny',
        defaults={'branche': 'Route'},
    )

    if User.objects.filter(email=email).exists():
        return

    password = getattr(settings, 'DEFAULT_CG_PASSWORD', 'ChangeMeCG2026!')
    User.objects.create_user(
        email=email,
        password=password,
        nom='Groupe',
        prenoms='Chef',
        role=Role.CG,
        statut=StatutCompte.ACTIF,
        groupe=groupe,
        is_staff=True,
    )
