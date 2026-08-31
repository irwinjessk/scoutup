from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActif, IsCC, IsCG, IsJeune
from gamification.services import get_or_create_scarf, serialize_scarf, sync_recoveries

from .models import Competition, CompetitionAttempt, CompetitionStatut
from .serializers import (
    MIN_QUESTIONS,
    CompetitionCreateSerializer,
    CompetitionDetailSerializer,
    CompetitionQuestionPublicSerializer,
    CompetitionSerializer,
    CompetitionUpdateSerializer,
)
from .services import (
    CompetitionError,
    answer_competition_question,
    build_classement,
    close_competition,
    join_competition,
    next_question,
    sync_closure,
)

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
        return (
            Competition.objects.filter(pk=pk, communaute_id=request.user.communaute_id)
            .prefetch_related('questions')
            .first()
        )

    def get(self, request, pk):
        competition = self._get(request, pk)
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CompetitionDetailSerializer(competition).data)

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
        with transaction.atomic():
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
        if competition.questions.count() < MIN_QUESTIONS:
            return Response(
                {'detail': f'Il faut au moins {MIN_QUESTIONS} questions pour publier.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        now = timezone.now()
        competition.statut = CompetitionStatut.OUVERTE
        competition.published_at = now
        competition.closes_at = now + timedelta(days=competition.duree_jours)
        competition.save(update_fields=['statut', 'published_at', 'closes_at'])
        return Response(CompetitionSerializer(competition).data)


class CCCompetitionCloseView(APIView):
    """Clôture manuelle anticipée — un CC doit pouvoir désactiver une compétition en cours."""

    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def post(self, request, pk):
        competition = Competition.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if competition.statut != CompetitionStatut.OUVERTE:
            return Response(
                {'detail': 'Seule une compétition ouverte peut être clôturée.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        close_competition(competition)
        return Response(CompetitionSerializer(competition).data)


class CCCompetitionClassementView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request, pk):
        competition = Competition.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        sync_closure(competition)
        return Response(
            {
                'competition': CompetitionSerializer(competition).data,
                'classement': build_classement(competition),
            }
        )


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


class JeuneCompetitionClassementView(APIView):
    """Classement de la compétition, sans notion d'amis dédiée : tous les jeunes
    de la communauté (périmètre mono-communauté de la Phase 1), avec sa propre
    ligne signalée (RF-46)."""

    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request, pk):
        competition = Competition.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not competition:
            return Response({'detail': 'Compétition introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        sync_closure(competition)
        return Response(build_classement(competition, moi_id=request.user.id))


# ── CG ──────────────────────────────────────────────────────────────


class CGCompetitionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCG]

    def get(self, request):
        from accounts.models import Role, StatutCompte, User

        competitions = (
            Competition.objects.filter(communaute__groupe_id=request.user.groupe_id)
            .select_related('communaute', 'created_by')
            .order_by('-created_at')
        )
        # Pas de prefetch_related('attempts__jeune') ici : build_classement() applique
        # son propre order_by() sur le related manager, ce qui ignorerait le cache de
        # prefetch et redéclencherait une requête de toute façon.

        nb_actifs_par_communaute = {}
        rows = []
        for competition in competitions:
            communaute_id = competition.communaute_id
            if communaute_id not in nb_actifs_par_communaute:
                nb_actifs_par_communaute[communaute_id] = User.objects.filter(
                    role=Role.JEUNE,
                    statut=StatutCompte.ACTIF,
                    communaute_id=communaute_id,
                ).count()

            classement = build_classement(competition)

            rows.append(
                {
                    'id': competition.id,
                    'titre': competition.titre,
                    'statut': competition.statut,
                    'communaute': competition.communaute.nom,
                    'cc_nom_complet': (
                        competition.created_by.nom_complet if competition.created_by else None
                    ),
                    'nb_participants': len(classement),
                    'nb_actifs': nb_actifs_par_communaute[communaute_id],
                    'classement': classement,
                    'published_at': competition.published_at,
                    'closes_at': competition.closes_at,
                }
            )
        return Response(rows)


# ── Public (lien partageable, RF-44) ──────────────────────────────────


class CompetitionShareView(APIView):
    """Page publique du lien partageable, générée à la clôture — aucune
    authentification requise, pensée pour un partage réseaux sociaux."""

    permission_classes = [permissions.AllowAny]

    def get(self, request, token):
        competition = (
            Competition.objects.filter(partage_token=token, statut=CompetitionStatut.CLOTUREE)
            .select_related('communaute')
            .first()
        )
        if not competition:
            return Response(
                {'detail': 'Lien introuvable ou compétition non clôturée.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        classement = build_classement(competition)
        return Response(
            {
                'titre': competition.titre,
                'communaute': competition.communaute.nom,
                'nb_participants': len(classement),
                'closes_at': competition.closes_at,
                'podium': classement[:3],
            }
        )
