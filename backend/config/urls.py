"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]

# Stockage local (pas de S3/CDN) : servir /media/ même hors DEBUG,
# sinon les fichiers uploadés (avatars, brevets) sont introuvables en prod.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
