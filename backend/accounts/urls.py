from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CCJeuneAcceptView,
    CCJeuneEtapeView,
    CCJeuneRejectView,
    CCJeunesListView,
    CCJeunesPendingView,
    CGCCAcceptView,
    CGCCListView,
    CGCCPendingView,
    CGCCRejectView,
    CGJeunesListView,
    JeuneEtapeCouranteView,
    JeuneEtapesListView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
)
from .oauth.views import OAuthLoginView, OAuthProvidersView, TikTokAuthorizeView

app_name = 'accounts'

urlpatterns = [
    # Auth
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('users/me/', MeView.as_view(), name='users-me'),
    # OAuth
    path('auth/oauth/providers/', OAuthProvidersView.as_view(), name='oauth-providers'),
    path('auth/oauth/tiktok/authorize/', TikTokAuthorizeView.as_view(), name='oauth-tiktok-authorize'),
    path('auth/oauth/<str:provider>/', OAuthLoginView.as_view(), name='oauth-login'),
    # CC — jeunes
    path('cc/jeunes/pending/', CCJeunesPendingView.as_view(), name='cc-jeunes-pending'),
    path('cc/jeunes/', CCJeunesListView.as_view(), name='cc-jeunes'),
    path('cc/jeunes/<int:pk>/accept/', CCJeuneAcceptView.as_view(), name='cc-jeune-accept'),
    path('cc/jeunes/<int:pk>/reject/', CCJeuneRejectView.as_view(), name='cc-jeune-reject'),
    path('cc/jeunes/<int:pk>/etape/', CCJeuneEtapeView.as_view(), name='cc-jeune-etape'),
    # CG — chefs & jeunes
    path('cg/cc/pending/', CGCCPendingView.as_view(), name='cg-cc-pending'),
    path('cg/cc/', CGCCListView.as_view(), name='cg-cc'),
    path('cg/cc/<int:pk>/accept/', CGCCAcceptView.as_view(), name='cg-cc-accept'),
    path('cg/cc/<int:pk>/reject/', CGCCRejectView.as_view(), name='cg-cc-reject'),
    path('cg/jeunes/', CGJeunesListView.as_view(), name='cg-jeunes'),
    # Jeune — étapes
    path('jeune/etapes/', JeuneEtapesListView.as_view(), name='jeune-etapes'),
    path('jeune/etape-courante/', JeuneEtapeCouranteView.as_view(), name='jeune-etape-courante'),
]
