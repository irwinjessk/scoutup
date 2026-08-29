from django.contrib.auth import authenticate, get_user_model
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from formation.models import Stage

from .models import Role, StatutCompte
from .permissions import IsActif, IsCC, IsCG, IsJeune
from .serializers import (
    AssignEtapeSerializer,
    CCListSerializer,
    EtapeCouranteSerializer,
    JeuneListSerializer,
    RegisterSerializer,
    StageSerializer,
    UserSerializer,
    UserUpdateSerializer,
    activer_compte,
    refuser_compte,
)

User = get_user_model()


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'id': user.id,
                'statut': user.statut,
                'message': 'Compte créé. En attente de validation par ton responsable.',
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').lower().strip()
        password = request.data.get('password') or ''

        user = authenticate(request, email=email, password=password)
        if user is None:
            return Response(
                {'detail': 'Identifiants invalides.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.statut != StatutCompte.ACTIF:
            return Response(
                {
                    'detail': 'Compte en attente de validation',
                    'statut': user.statut,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {
                'user': UserSerializer(user).data,
                'tokens': tokens_for_user(user),
            }
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        refresh = request.data.get('refresh')
        if not refresh:
            return Response(
                {'detail': 'Le refresh token est requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception:
            return Response(
                {'detail': 'Token invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsActif]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_object(self):
        return User.objects.select_related('etape_courante').get(pk=self.request.user.pk)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            UserSerializer(instance, context=self.get_serializer_context()).data
        )


class CCJeunesPendingView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCC]
    serializer_class = JeuneListSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=Role.JEUNE,
            statut=StatutCompte.EN_ATTENTE,
            communaute_id=self.request.user.communaute_id,
        ).select_related('etape_courante')


class CCJeunesListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCC]
    serializer_class = JeuneListSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=Role.JEUNE,
            statut=StatutCompte.ACTIF,
            communaute_id=self.request.user.communaute_id,
        ).select_related('etape_courante')


class CCJeuneAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCC]

    def post(self, request, pk):
        jeune = User.objects.filter(
            pk=pk,
            role=Role.JEUNE,
            statut=StatutCompte.EN_ATTENTE,
            communaute_id=request.user.communaute_id,
        ).first()
        if not jeune:
            return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        activer_compte(jeune, request.user)
        return Response(JeuneListSerializer(jeune).data)


class CCJeuneRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCC]

    def post(self, request, pk):
        jeune = User.objects.filter(
            pk=pk,
            role=Role.JEUNE,
            statut=StatutCompte.EN_ATTENTE,
            communaute_id=request.user.communaute_id,
        ).first()
        if not jeune:
            return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        refuser_compte(jeune, request.user)
        return Response(JeuneListSerializer(jeune).data)


class CCJeuneEtapeView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def patch(self, request, pk):
        jeune = User.objects.filter(
            pk=pk,
            role=Role.JEUNE,
            communaute_id=request.user.communaute_id,
        ).select_related('etape_courante').first()
        if not jeune:
            return Response({'detail': 'Jeune introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AssignEtapeSerializer(
            data=request.data,
            context={'request': request, 'jeune': jeune},
        )
        serializer.is_valid(raise_exception=True)
        jeune = serializer.save()
        return Response(JeuneListSerializer(jeune).data)


class CGCCPendingView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCG]
    serializer_class = CCListSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=Role.CC,
            statut=StatutCompte.EN_ATTENTE,
            groupe_id=self.request.user.groupe_id,
        )


class CGCCListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCG]
    serializer_class = CCListSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=Role.CC,
            statut=StatutCompte.ACTIF,
            groupe_id=self.request.user.groupe_id,
        )


class CGCCAcceptView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCG]

    def post(self, request, pk):
        chef = User.objects.filter(
            pk=pk,
            role=Role.CC,
            statut=StatutCompte.EN_ATTENTE,
            groupe_id=request.user.groupe_id,
        ).first()
        if not chef:
            return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if not chef.groupe_id:
            chef.groupe = request.user.groupe
            chef.save(update_fields=['groupe', 'updated_at'])
        activer_compte(chef, request.user)
        return Response(CCListSerializer(chef).data)


class CGCCRejectView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsCG]

    def post(self, request, pk):
        chef = User.objects.filter(
            pk=pk,
            role=Role.CC,
            statut=StatutCompte.EN_ATTENTE,
            groupe_id=request.user.groupe_id,
        ).first()
        if not chef:
            return Response({'detail': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        refuser_compte(chef, request.user)
        return Response(CCListSerializer(chef).data)


class CGJeunesListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsCG]
    serializer_class = JeuneListSerializer

    def get_queryset(self):
        return User.objects.filter(
            role=Role.JEUNE,
            groupe_id=self.request.user.groupe_id,
        ).exclude(statut=StatutCompte.REFUSE)


class JeuneEtapesListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]
    serializer_class = StageSerializer

    def get_queryset(self):
        user = self.request.user
        if user.communaute_id:
            from formation.services import ensure_default_stages

            ensure_default_stages(user.communaute)
        return Stage.objects.filter(
            communaute_id=user.communaute_id,
            actif=True,
        ).order_by('ordre')


class JeuneEtapeCouranteView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def post(self, request):
        serializer = EtapeCouranteSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)
