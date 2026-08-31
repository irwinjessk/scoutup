from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActif, IsCC, IsJeune
from gamification.services import get_or_create_scarf, serialize_scarf, sync_recoveries

from .models import Competition, CompetitionAttempt, CompetitionStatut
from .serializers import (
    CompetitionCreateSerializer,
    CompetitionQuestionPublicSerializer,
    CompetitionSerializer,
    CompetitionUpdateSerializer,
)
from .services import CompetitionError, answer_competition_question, join_competition, next_question, sync_closure

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


# ── Jeune ───────────────────────────────────────────────────────────


class JeuneCompetitionListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request):
        if not request.user.communaute_id:
            return Response([])

        qs = Competition.objects.filter(
            communaute_id=request.user.communaute_id,
            statut=CompetitionStatut.OUVERTE,
        )
        for competition in qs:
            sync_closure(competition)
        ouvertes = [c for c in qs if c.statut == CompetitionStatut.OUVERTE]

        attempts = {
            a.competition_id: a
            for a in CompetitionAttempt.objects.filter(
                jeune=request.user, competition__in=ouvertes
            )
        }

        rows = []
        for competition in ouvertes:
            attempt = attempts.get(competition.id)
            rows.append(
                {
                    'id': competition.id,
                    'titre': competition.titre,
                    'duree_jours': competition.duree_jours,
                    'closes_at': competition.closes_at,
                    'nb_questions': competition.questions.count(),
                    'deja_rejoint': attempt is not None,
                    'mon_score': attempt.score if attempt else None,
                }
            )
        return Response(rows)


class JeuneCompetitionJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def post(self, request, pk):
        competition = Competition.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            attempt = join_competition(request.user, competition)
        except CompetitionError as exc:
            return Response({'detail': exc.message}, status=exc.status)
        return Response({'attempt_id': attempt.id}, status=status.HTTP_201_CREATED)


class JeuneCompetitionQuestionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request, pk):
        competition = Competition.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            attempt, question, scarf = next_question(request.user, competition)
        except CompetitionError as exc:
            return Response({'detail': exc.message}, status=exc.status)

        return Response(
            {
                'question': CompetitionQuestionPublicSerializer(question).data if question else None,
                'termine': question is None,
                'score': attempt.score,
                'foulard': serialize_scarf(sync_recoveries(get_or_create_scarf(request.user))),
            }
        )


class JeuneCompetitionAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def post(self, request, pk):
        competition = Competition.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        question_id = request.data.get('question_id')
        if not question_id:
            return Response({'detail': 'question_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = answer_competition_question(
                request.user, competition, question_id, request.data.get('reponse')
            )
        except CompetitionError as exc:
            return Response({'detail': exc.message}, status=exc.status)

        result['foulard'] = serialize_scarf(sync_recoveries(get_or_create_scarf(request.user)))
        return Response(result)
