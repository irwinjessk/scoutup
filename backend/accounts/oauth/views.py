"""Vues HTTP OAuth (Google, TikTok, …)."""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import StatutCompte
from ..serializers import UserSerializer
from ..views import tokens_for_user
from . import OAuthError, authenticate_oauth, get_provider, list_providers


class OAuthProvidersView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'providers': list_providers()})


class OAuthLoginView(APIView):
    """
    POST /api/v1/auth/oauth/<provider>/

    Google  : { "id_token": "..." }
    TikTok  : { "code": "...", "redirect_uri": "..." }
    Optionnel (création) : role, communaute_id
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request, provider):
        role = request.data.get('role')
        communaute_id = request.data.get('communaute_id')
        try:
            if communaute_id is not None and communaute_id != '':
                communaute_id = int(communaute_id)
            else:
                communaute_id = None
            user = authenticate_oauth(
                provider,
                request.data,
                role=role,
                communaute_id=communaute_id,
            )
        except OAuthError as exc:
            return Response({'detail': exc.message}, status=exc.status)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'Payload OAuth invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user.statut != StatutCompte.ACTIF:
            return Response(
                {
                    'detail': 'Compte en attente de validation',
                    'statut': user.statut,
                    'user': UserSerializer(user).data,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                'user': UserSerializer(user).data,
                'tokens': tokens_for_user(user),
            }
        )


class TikTokAuthorizeView(APIView):
    """Retourne l'URL d'autorisation TikTok à ouvrir côté client."""

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        redirect_uri = (request.query_params.get('redirect_uri') or '').strip()
        state = (request.query_params.get('state') or 'scoutup').strip()
        if not redirect_uri:
            return Response(
                {'detail': 'redirect_uri requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            provider = get_provider('tiktok')
            url = provider.build_authorize_url(redirect_uri=redirect_uri, state=state)
        except OAuthError as exc:
            return Response({'detail': exc.message}, status=exc.status)
        except AttributeError:
            return Response(
                {'detail': 'Provider TikTok indisponible.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({'authorize_url': url})
