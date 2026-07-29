from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    ordering = ('email',)
    list_display = ('email', 'telephone', 'nom', 'prenoms', 'role', 'statut', 'is_staff')
    list_filter = ('role', 'statut', 'is_staff', 'is_superuser')
    search_fields = ('email', 'telephone', 'nom', 'prenoms')

    fieldsets = (
        (None, {'fields': ('email', 'telephone', 'password')}),
        ('Identité', {'fields': ('nom', 'prenoms', 'date_naissance', 'genre', 'avatar')}),
        ('Rôle & statut', {'fields': ('role', 'statut', 'groupe', 'communaute', 'etape_courante')}),
        ('Validation', {'fields': ('valide_par', 'valide_le')}),
        ('OAuth', {'fields': ('auth_provider', 'oauth_id')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates', {'fields': ('last_login', 'created_at', 'updated_at')}),
    )
    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': ('email', 'telephone', 'nom', 'prenoms', 'role', 'password1', 'password2'),
            },
        ),
    )
    readonly_fields = ('created_at', 'updated_at', 'last_login')
    filter_horizontal = ('groups', 'user_permissions')
