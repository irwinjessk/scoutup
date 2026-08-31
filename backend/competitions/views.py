from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActif, IsCC

from .models import Competition, CompetitionStatut
from .serializers import (
    CompetitionCreateSerializer,
    CompetitionSerializer,
    CompetitionUpdateSerializer,
)
from .services import sync_closure

# ── CC ──────────────────────────────────────────────────────────────


class CCCompetitionListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request):
        qs = Competition.objects.filter(communaute_id=request.user.communaute_id)
        for competition in qs:
            sync_closure(competition)
        return Response(CompetitionSerializer(qs, many=True).data)

    def post(self, request):
        if not request.user.communaute_id:
            return Response(
                {'detail': 'Communauté manquante.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = CompetitionCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        competition = serializer.save()
        return Response(CompetitionSerializer(competition).data, status=status.HTTP_201_CREATED)


class CCCompetitionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def _get(self, request, pk):
        return Competition.objects.filter(pk=pk, communaute_id=request.user.communaute_id).first()

    def put(self, request, pk):
        competition = self._get(request, pk)
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if competition.statut != CompetitionStatut.BROUILLON:
            return Response(
                {'detail': 'Seule une compétition en brouillon peut être modifiée.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        serializer = CompetitionUpdateSerializer(competition, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(CompetitionSerializer(competition).data)


class CCCompetitionPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def post(self, request, pk):
        competition = Competition.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if competition.statut != CompetitionStatut.BROUILLON:
            return Response(
                {'detail': 'Cette compétition est déjà publiée ou clôturée.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        if not competition.questions.exists():
            return Response(
                {'detail': 'Ajoute au moins une question avant de publier.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        now = timezone.now()
        competition.statut = CompetitionStatut.OUVERTE
        competition.published_at = now
        competition.closes_at = now + timedelta(days=competition.duree_jours)
        competition.save(update_fields=['statut', 'published_at', 'closes_at'])
        return Response(CompetitionSerializer(competition).data)
