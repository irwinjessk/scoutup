"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
https://docs.djangoproject.com/en/5.2/topics/http/urls/
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve as serve_static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.urls')),
]

# Stockage local (pas de S3/CDN) : servir /media/ même hors DEBUG.
# `django.conf.urls.static.static()` no-op silencieusement si DEBUG=False,
# donc on appelle la vue `serve` directement pour que ça marche aussi en prod.
urlpatterns += [
    re_path(
        r'^%s(?P<path>.*)$' % settings.MEDIA_URL.lstrip('/'),
        serve_static,
        {'document_root': settings.MEDIA_ROOT},
    ),
]
