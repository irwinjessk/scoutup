from django.contrib import admin

from .models import Stage


@admin.register(Stage)
class StageAdmin(admin.ModelAdmin):
    list_display = ('titre', 'code', 'ordre', 'communaute', 'actif')
    list_filter = ('code', 'actif', 'communaute')
    search_fields = ('titre',)
