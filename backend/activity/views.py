from django.db.models import Count
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActif, IsCC, IsCG
from competitions.models import Competition, CompetitionAttempt, CompetitionStatut
from competitions.services import sync_closure as sync_closure_competition
from evaluations.models import Evaluation, EvaluationAttempt, EvaluationStatut
from evaluations.services import sync_closure as sync_closure_evaluation
from formation.models import FormationProgress, ProgressStatut, Question, Stage


class CCDashboardView(APIView):
    """Statistiques de la communauté du CC : participation, résultats, progression
    par étape (RF-70)."""

    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request):
        from accounts.models import Role, StatutCompte, User

        communaute_id = request.user.communaute_id

        jeunes_actifs = User.objects.filter(
            role=Role.JEUNE, statut=StatutCompte.ACTIF, communaute_id=communaute_id
        ).count()
        jeunes_en_attente = User.objects.filter(
            role=Role.JEUNE, statut=StatutCompte.EN_ATTENTE, communaute_id=communaute_id
        ).count()

        stages = Stage.objects.filter(communaute_id=communaute_id, actif=True).order_by('ordre')
        counts_par_stage = {}
        for row in (
            FormationProgress.objects.filter(stage__in=stages)
            .values('stage_id', 'statut')
            .annotate(n=Count('id'))
        ):
            counts_par_stage.setdefault(row['stage_id'], {})[row['statut']] = row['n']

        progression_par_etape = [
            {
                'stage_id': stage.id,
                'titre': stage.titre,
                'en_cours': counts_par_stage.get(stage.id, {}).get(ProgressStatut.EN_COURS, 0),
                'valide': counts_par_stage.get(stage.id, {}).get(ProgressStatut.VALIDE, 0),
                'acquis': counts_par_stage.get(stage.id, {}).get(ProgressStatut.ACQUIS, 0),
            }
            for stage in stages
        ]

        for evaluation in Evaluation.objects.filter(
            communaute_id=communaute_id, statut=EvaluationStatut.OUVERTE
        ):
            sync_closure_evaluation(evaluation)

        evaluations_cloturees = Evaluation.objects.filter(
            communaute_id=communaute_id, statut=EvaluationStatut.CLOTUREE
        )
        nb_evaluations = evaluations_cloturees.count()
        attempts_notes = list(
            EvaluationAttempt.objects.filter(
                evaluation__in=evaluations_cloturees, submitted_at__isnull=False
            ).values('score', 'score_max')
        )
        nb_presences = EvaluationAttempt.objects.filter(
            evaluation__in=evaluations_cloturees
        ).count()
        pourcentages = [
            float(a['score']) / float(a['score_max']) * 100
            for a in attempts_notes
            if a['score_max']
        ]
        moyenne_notes = round(sum(pourcentages) / len(pourcentages), 1) if pourcentages else None
        taux_presence_moyen = (
            round(100 * nb_presences / (nb_evaluations * jeunes_actifs), 1)
            if nb_evaluations and jeunes_actifs
            else None
        )

        for competition in Competition.objects.filter(
            communaute_id=communaute_id, statut=CompetitionStatut.OUVERTE
        ):
            sync_closure_competition(competition)

        competitions_cloturees = Competition.objects.filter(
            communaute_id=communaute_id, statut=CompetitionStatut.CLOTUREE
        )

        return Response(
            {
                'jeunes_actifs': jeunes_actifs,
                'jeunes_en_attente': jeunes_en_attente,
                'progression_par_etape': progression_par_etape,
                'evaluations': {
                    'nb_realisees': nb_evaluations,
                    'taux_presence_moyen': taux_presence_moyen,
                    'moyenne_notes': moyenne_notes,
                },
                'competitions': {
                    'nb_realisees': competitions_cloturees.count(),
                    'nb_participations': CompetitionAttempt.objects.filter(
                        competition__in=competitions_cloturees
                    ).count(),
                },
            }
        )


class CGDashboardView(APIView):
    """Supervision globale du groupe : chefs actifs, contenus créés, historique des
    évaluations, évolution des jeunes (RF-71)."""

    permission_classes = [permissions.IsAuthenticated, IsActif, IsCG]

    def get(self, request):
        from accounts.models import Role, StatutCompte, User

        groupe_id = request.user.groupe_id

        chefs_actifs = User.objects.filter(
            role=Role.CC, statut=StatutCompte.ACTIF, communaute__groupe_id=groupe_id
        ).count()
        chefs_en_attente = User.objects.filter(
            role=Role.CC, statut=StatutCompte.EN_ATTENTE, communaute__groupe_id=groupe_id
        ).count()

        contenus = {
            'nb_etapes': Stage.objects.filter(communaute__groupe_id=groupe_id).count(),
            'nb_questions_formation': Question.objects.filter(
                stage__communaute__groupe_id=groupe_id
            ).count(),
            'nb_evaluations': Evaluation.objects.filter(
                communaute__groupe_id=groupe_id
            ).count(),
            'nb_competitions': Competition.objects.filter(
                communaute__groupe_id=groupe_id
            ).count(),
        }

        evaluations_recentes = (
            Evaluation.objects.filter(communaute__groupe_id=groupe_id)
            .select_related('communaute')
            .order_by('-created_at')[:5]
        )
        for evaluation in evaluations_recentes:
            sync_closure_evaluation(evaluation)
        historique = [
            {
                'id': e.id,
                'titre': e.titre,
                'communaute': e.communaute.nom,
                'statut': e.statut,
                'published_at': e.published_at,
            }
            for e in evaluations_recentes
        ]

        jeunes_actifs = User.objects.filter(
            role=Role.JEUNE, statut=StatutCompte.ACTIF, communaute__groupe_id=groupe_id
        ).count()
        par_statut = {
            row['statut']: row['n']
            for row in (
                FormationProgress.objects.filter(stage__communaute__groupe_id=groupe_id)
                .values('statut')
                .annotate(n=Count('id'))
            )
        }

        return Response(
            {
                'chefs_actifs': chefs_actifs,
                'chefs_en_attente': chefs_en_attente,
                'contenus': contenus,
                'evaluations_recentes': historique,
                'jeunes': {
                    'nb_actifs': jeunes_actifs,
                    'en_cours': par_statut.get(ProgressStatut.EN_COURS, 0),
                    'valide': par_statut.get(ProgressStatut.VALIDE, 0),
                    'acquis': par_statut.get(ProgressStatut.ACQUIS, 0),
                },
            }
        )
