from django.urls import include, path

app_name = 'api_v1'

urlpatterns = [
    path('', include('accounts.urls')),
    path('', include('organization.urls')),
    path('', include(('formation.urls', 'formation'))),
    path('', include(('evaluations.urls', 'evaluations'))),
    path('', include(('competitions.urls', 'competitions'))),
    path('', include(('activity.urls', 'activity'))),
]
