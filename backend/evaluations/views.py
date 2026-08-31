from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActif, IsCC, IsCG, IsJeune

from .models import Evaluation, EvaluationAttempt, EvaluationStatut
from .serializers import (
    EvaluationAnswerDetailSerializer,
    EvaluationAttemptResultSerializer,
    EvaluationCreateSerializer,
    EvaluationQuestionPublicSerializer,
    EvaluationSerializer,
    EvaluationUpdateSerializer,
    JeuneEvaluationAttemptSerializer,
)
from .services import close_evaluation, grade_attempt, sync_closure

# ── CC ──────────────────────────────────────────────────────────────


class CCEvaluationListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request):
        qs = Evaluation.objects.filter(communaute_id=request.user.communaute_id)
        for evaluation in qs:
            sync_closure(evaluation)
        return Response(EvaluationSerializer(qs, many=True).data)

    def post(self, request):
        if not request.user.communaute_id:
            return Response(
                {'detail': 'Communauté manquante.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EvaluationCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        evaluation = serializer.save()
        return Response(EvaluationSerializer(evaluation).data, status=status.HTTP_201_CREATED)


class CCEvaluationDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def _get(self, request, pk):
        return Evaluation.objects.filter(pk=pk, communaute_id=request.user.communaute_id).first()

    def put(self, request, pk):
        evaluation = self._get(request, pk)
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if evaluation.statut != EvaluationStatut.BROUILLON:
            return Response(
                {'detail': 'Seule une évaluation en brouillon peut être modifiée.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        serializer = EvaluationUpdateSerializer(evaluation, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(EvaluationSerializer(evaluation).data)


class CCEvaluationPublishView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def post(self, request, pk):
        evaluation = Evaluation.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if evaluation.statut != EvaluationStatut.BROUILLON:
            return Response(
                {'detail': 'Cette évaluation est déjà publiée ou clôturée.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        if not evaluation.questions.exists():
            return Response(
                {'detail': 'Ajoute au moins une question avant de publier.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        now = timezone.now()
        evaluation.statut = EvaluationStatut.OUVERTE
        evaluation.published_at = now
        evaluation.closes_at = now + timedelta(minutes=evaluation.duree_minutes)
        evaluation.save(update_fields=['statut', 'published_at', 'closes_at'])
        return Response(EvaluationSerializer(evaluation).data)


class CCEvaluationCloseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def post(self, request, pk):
        evaluation = Evaluation.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if evaluation.statut != EvaluationStatut.OUVERTE:
            return Response(
                {'detail': 'Seule une évaluation ouverte peut être clôturée.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        close_evaluation(evaluation)
        return Response(EvaluationSerializer(evaluation).data)


class CCEvaluationResultsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request, pk):
        from accounts.models import Role, StatutCompte, User

        evaluation = Evaluation.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        sync_closure(evaluation)

        attempts = evaluation.attempts.select_related('jeune').all()
        rows = list(EvaluationAttemptResultSerializer(attempts, many=True).data)

        absents = User.objects.filter(
            role=Role.JEUNE,
            statut=StatutCompte.ACTIF,
            communaute_id=evaluation.communaute_id,
        ).exclude(id__in=[a.jeune_id for a in attempts])
        for jeune in absents:
            rows.append(
                {
                    'jeune_id': jeune.id,
                    'nom_complet': jeune.nom_complet,
                    'email': jeune.email,
                    'score': None,
                    'score_max': None,
                    'present': False,
                    'started_at': None,
                    'submitted_at': None,
                    'temps_minutes': None,
                }
            )

        return Response(
            {
                'evaluation': EvaluationSerializer(evaluation).data,
                'participants': rows,
            }
        )


class CCEvaluationParticipantDetailView(APIView):
    """Détail question par question des réponses d'un participant, pour le CC."""

    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request, pk, jeune_id):
        evaluation = Evaluation.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        attempt = (
            evaluation.attempts.filter(jeune_id=jeune_id).select_related('jeune').first()
        )
        if not attempt:
            return Response(
                {'detail': "Ce jeune n'a pas participé à cette évaluation."},
                status=status.HTTP_404_NOT_FOUND,
            )

        reponses = attempt.reponses.select_related('question').order_by(
            'question__ordre', 'question__id'
        )
        return Response(
            {
                'jeune_id': attempt.jeune_id,
                'nom_complet': attempt.jeune.nom_complet,
                'score': attempt.score,
                'score_max': attempt.score_max,
                'reponses': EvaluationAnswerDetailSerializer(reponses, many=True).data,
            }
        )


class CCPresencesView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request):
        from accounts.models import Role, StatutCompte, User

        total_actifs = User.objects.filter(
            role=Role.JEUNE,
            statut=StatutCompte.ACTIF,
            communaute_id=request.user.communaute_id,
        ).count()

        evaluations = Evaluation.objects.filter(
            communaute_id=request.user.communaute_id,
            statut=EvaluationStatut.CLOTUREE,
        ).order_by('-published_at')

        rows = []
        for evaluation in evaluations:
            nb_presents = evaluation.attempts.count()
            rows.append(
                {
                    'evaluation_id': evaluation.id,
                    'titre': evaluation.titre,
                    'date': evaluation.published_at,
                    'presents': nb_presents,
                    'total': total_actifs,
                    'taux': round(nb_presents / total_actifs * 100, 1) if total_actifs else 0,
                }
            )
        return Response(rows)


# ── Jeune ───────────────────────────────────────────────────────────


class JeuneEvaluationListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request):
        if not request.user.communaute_id:
            return Response({'ouvertes': [], 'historique': []})

        qs = Evaluation.objects.filter(
            communaute_id=request.user.communaute_id,
            statut=EvaluationStatut.OUVERTE,
        )
        for evaluation in qs:
            sync_closure(evaluation)
        ouvertes = [e for e in qs if e.statut == EvaluationStatut.OUVERTE]

        historique = (
            EvaluationAttempt.objects.filter(jeune=request.user, submitted_at__isnull=False)
            .select_related('evaluation')
            .order_by('-submitted_at')[:20]
        )

        return Response(
            {
                'ouvertes': EvaluationSerializer(ouvertes, many=True).data,
                'historique': JeuneEvaluationAttemptSerializer(historique, many=True).data,
            }
        )


class JeuneEvaluationJoinView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def post(self, request, pk):
        evaluation = Evaluation.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        sync_closure(evaluation)
        if evaluation.statut != EvaluationStatut.OUVERTE:
            return Response(
                {'detail': "Cette évaluation n'est plus ouverte."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        attempt, _ = EvaluationAttempt.objects.get_or_create(
            evaluation=evaluation, jeune=request.user
        )
        return Response(
            {'attempt_id': attempt.id, 'closes_at': evaluation.closes_at},
            status=status.HTTP_201_CREATED,
        )


class JeuneEvaluationQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request, pk):
        evaluation = Evaluation.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        sync_closure(evaluation)
        if not EvaluationAttempt.objects.filter(evaluation=evaluation, jeune=request.user).exists():
            return Response(
                {'detail': "Rejoins d'abord l'évaluation."}, status=status.HTTP_403_FORBIDDEN
            )
        if evaluation.statut != EvaluationStatut.OUVERTE:
            return Response(
                {'detail': 'Cette évaluation est clôturée.'},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        questions = evaluation.questions.all()
        return Response(
            {
                'closes_at': evaluation.closes_at,
                'questions': EvaluationQuestionPublicSerializer(questions, many=True).data,
            }
        )


class JeuneEvaluationSubmitView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def post(self, request, pk):
        evaluation = Evaluation.objects.filter(
            pk=pk, communaute_id=request.user.communaute_id
        ).first()
        if not evaluation:
            return Response({'detail': 'Évaluation introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        attempt = EvaluationAttempt.objects.filter(
            evaluation=evaluation, jeune=request.user
        ).first()
        if not attempt:
            return Response(
                {'detail': "Rejoins d'abord l'évaluation."}, status=status.HTTP_403_FORBIDDEN
            )
        if attempt.submitted_at is not None:
            return Response({'detail': 'Réponses déjà soumises.'}, status=status.HTTP_409_CONFLICT)

        sync_closure(evaluation)
        if evaluation.statut != EvaluationStatut.OUVERTE:
            return Response(
                {'detail': "Temps écoulé, l'évaluation est clôturée."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        reponses = request.data.get('reponses')
        if not isinstance(reponses, list) or not reponses:
            return Response({'detail': 'reponses requis.'}, status=status.HTTP_400_BAD_REQUEST)

        grade_attempt(attempt, reponses)
        return Response({'score': attempt.score, 'score_max': attempt.score_max})


class JeuneEvaluationAttemptDetailView(APIView):
    """Correctif question par question d'une tentative passée, réservé au jeune concerné.

    Les bonnes réponses ne sont révélées qu'une fois l'évaluation clôturée, pour ne pas
    avantager un jeune qui aurait fini avant les autres.
    """

    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request, attempt_id):
        attempt = (
            EvaluationAttempt.objects.filter(pk=attempt_id, jeune=request.user)
            .select_related('evaluation')
            .first()
        )
        if not attempt:
            return Response({'detail': 'Tentative introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        sync_closure(attempt.evaluation)
        corrige = attempt.evaluation.statut == EvaluationStatut.CLOTUREE

        reponses = attempt.reponses.select_related('question').order_by(
            'question__ordre', 'question__id'
        )
        data = EvaluationAnswerDetailSerializer(reponses, many=True).data
        if not corrige:
            for row in data:
                row['reponse_attendue'] = None
                row['est_correcte'] = None

        return Response(
            {
                'evaluation_titre': attempt.evaluation.titre,
                'score': attempt.score,
                'score_max': attempt.score_max,
                'corrige': corrige,
                'reponses': data,
            }
        )


# ── CG ──────────────────────────────────────────────────────────────


class CGEvaluationsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCG]

    def get(self, request):
        evaluations = (
            Evaluation.objects.filter(communaute__groupe_id=request.user.groupe_id)
            .select_related('communaute', 'created_by')
            .order_by('-created_at')
        )
        rows = []
        for evaluation in evaluations:
            rows.append(
                {
                    'id': evaluation.id,
                    'titre': evaluation.titre,
                    'statut': evaluation.statut,
                    'communaute': evaluation.communaute.nom,
                    'cc_nom_complet': (
                        evaluation.created_by.nom_complet if evaluation.created_by else None
                    ),
                    'nb_participants': evaluation.attempts.count(),
                    'published_at': evaluation.published_at,
                    'closes_at': evaluation.closes_at,
                }
            )
        return Response(rows)
