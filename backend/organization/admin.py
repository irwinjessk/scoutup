from django.contrib import admin

from .models import Communaute, Groupe


@admin.register(Groupe)
class GroupeAdmin(admin.ModelAdmin):
    list_display = ('nom', 'district', 'region', 'created_at')
    search_fields = ('nom', 'district', 'region')


@admin.register(Communaute)
class CommunauteAdmin(admin.ModelAdmin):
    list_display = ('nom', 'branche', 'groupe', 'created_at')
    list_filter = ('branche', 'groupe')
    search_fields = ('nom',)
