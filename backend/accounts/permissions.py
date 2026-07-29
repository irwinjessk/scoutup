from rest_framework.permissions import BasePermission

from .models import Role, StatutCompte


class IsActif(BasePermission):
    message = 'Compte en attente de validation.'

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.statut == StatutCompte.ACTIF)


class IsRole(BasePermission):
    allowed_roles = ()

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.statut == StatutCompte.ACTIF
            and user.role in self.allowed_roles
        )


class IsJeune(IsRole):
    allowed_roles = (Role.JEUNE,)


class IsCC(IsRole):
    allowed_roles = (Role.CC,)


class IsCG(IsRole):
    allowed_roles = (Role.CG,)
