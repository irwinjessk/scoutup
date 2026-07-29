from django.contrib import admin

from .models import ScarfState


@admin.register(ScarfState)
class ScarfStateAdmin(admin.ModelAdmin):
    list_display = ('jeune', 'moities_perdues', 'updated_at')
