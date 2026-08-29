from django.http import FileResponse, Http404
from rest_framework import permissions, status
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsActif, IsCC, IsCG, IsJeune
from gamification.services import get_or_create_scarf, serialize_scarf, sync_recoveries

from .models import Certificate, Question, Stage
from .serializers import (
    CertificateSerializer,
    FormationProgressSerializer,
    QuestionPublicSerializer,
    QuestionSerializer,
    StageSerializer,
    StageUpdateSerializer,
)
from .services import (
    FormationError,
    answer_question,
    ensure_default_stages,
    next_question,
    overview_for_jeune,
    start_formation,
)


class PDFFileRenderer(BaseRenderer):
    """Accepte Accept: application/pdf pour les téléchargements brevet."""

    media_type = 'application/pdf'
    format = 'pdf'
    charset = None
    render_style = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


class AnyFileRenderer(BaseRenderer):
    media_type = '*/*'
    format = 'bin'
    charset = None
    render_style = 'binary'

    def render(self, data, accepted_media_type=None, renderer_context=None):
        return data


def _err(exc: FormationError):
    return Response({'detail': exc.message}, status=exc.status)


# ── CC ──────────────────────────────────────────────────────────────


class CCStageListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request):
        if not request.user.communaute_id:
            return Response([])
        stages, _ = ensure_default_stages(request.user.communaute, created_by=request.user)
        return Response(StageSerializer(stages, many=True).data)

    def post(self, request):
        """Initialise les 4 étapes de la communauté CC."""
        if not request.user.communaute_id:
            return Response(
                {'detail': 'Communauté manquante.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        stages, created = ensure_default_stages(
            request.user.communaute,
            created_by=request.user,
        )
        return Response(
            {
                'created': len(created),
                'stages': StageSerializer(stages, many=True).data,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class CCStageDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def patch(self, request, pk):
        stage = Stage.objects.filter(
            pk=pk,
            communaute_id=request.user.communaute_id,
        ).first()
        if not stage:
            return Response({'detail': 'Étape introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = StageUpdateSerializer(stage, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(StageSerializer(stage).data)


class CCStageQuestionsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def get(self, request, pk):
        stage = Stage.objects.filter(pk=pk, communaute_id=request.user.communaute_id).first()
        if not stage:
            return Response({'detail': 'Étape introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        qs = Question.objects.filter(stage=stage).order_by('ordre', 'id')
        return Response(QuestionSerializer(qs, many=True).data)

    def post(self, request, pk):
        stage = Stage.objects.filter(pk=pk, communaute_id=request.user.communaute_id).first()
        if not stage:
            return Response({'detail': 'Étape introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = QuestionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.save(stage=stage, created_by=request.user)
        stage.nb_questions_parcours = Question.objects.filter(stage=stage, actif=True).count()
        stage.save(update_fields=['nb_questions_parcours'])
        return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)


class CCQuestionDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCC]

    def _get(self, request, pk):
        return (
            Question.objects.select_related('stage')
            .filter(pk=pk, stage__communaute_id=request.user.communaute_id)
            .first()
        )

    def _refresh_stage_count(self, stage):
        stage.nb_questions_parcours = Question.objects.filter(stage=stage, actif=True).count()
        stage.save(update_fields=['nb_questions_parcours'])

    def put(self, request, pk):
        question = self._get(request, pk)
        if not question:
            return Response({'detail': 'Question introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = QuestionSerializer(question, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self._refresh_stage_count(question.stage)
        return Response(QuestionSerializer(question).data)

    def patch(self, request, pk):
        question = self._get(request, pk)
        if not question:
            return Response({'detail': 'Question introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = QuestionSerializer(question, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        self._refresh_stage_count(question.stage)
        return Response(QuestionSerializer(question).data)

    def delete(self, request, pk):
        """Désactive plutôt que supprimer (soft-delete métier)."""
        question = self._get(request, pk)
        if not question:
            return Response({'detail': 'Question introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        question.actif = False
        question.save(update_fields=['actif', 'updated_at'])
        self._refresh_stage_count(question.stage)
        return Response(QuestionSerializer(question).data)


# ── Jeune ───────────────────────────────────────────────────────────


class JeuneFormationOverviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request):
        rows = overview_for_jeune(request.user)
        payload = []
        for row in rows:
            payload.append(
                {
                    'stage': StageSerializer(row['stage']).data,
                    'statut': row['statut'],
                    'nb_reussies': row['nb_reussies'],
                    'nb_total': row['nb_total'],
                    'progress': (
                        FormationProgressSerializer(row['progress']).data
                        if row['progress']
                        else None
                    ),
                }
            )
        return Response(payload)


class JeuneFormationStartView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def post(self, request):
        stage_id = request.data.get('stage_id')
        try:
            progress = start_formation(
                request.user,
                int(stage_id) if stage_id not in (None, '') else None,
            )
        except FormationError as exc:
            return _err(exc)
        except (TypeError, ValueError):
            return Response({'detail': 'stage_id invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(FormationProgressSerializer(progress).data)


class JeuneFormationNextQuestionView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request):
        try:
            progress, question, foulard = next_question(request.user)
        except FormationError as exc:
            return _err(exc)
        return Response(
            {
                'progress': FormationProgressSerializer(progress).data,
                'question': QuestionPublicSerializer(question).data if question else None,
                'foulard': foulard,
                'termine': question is None and progress.statut != 'EN_COURS',
            }
        )


class JeuneFormationAnswerView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def post(self, request):
        question_id = request.data.get('question_id')
        reponse = request.data.get('reponse')
        if question_id is None:
            return Response(
                {'detail': 'question_id requis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            result = answer_question(request.user, int(question_id), reponse)
        except FormationError as exc:
            return _err(exc)
        except (TypeError, ValueError):
            return Response(
                {'detail': 'Payload invalide.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = {
            'ok': result['ok'],
            'explication': result['explication'],
            'progress': FormationProgressSerializer(result['progress']).data,
            'foulard': result['foulard'],
            'completed': result['completed'],
            'brevet': (
                CertificateSerializer(result['brevet']).data if result['brevet'] else None
            ),
        }
        return Response(payload)


class JeuneFoulardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request):
        state = sync_recoveries(get_or_create_scarf(request.user))
        return Response(serialize_scarf(state))


class JeuneBrevetsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]

    def get(self, request):
        qs = Certificate.objects.filter(jeune=request.user).select_related('stage')
        return Response(CertificateSerializer(qs, many=True).data)


class JeuneBrevetDownloadView(APIView):
    """PDF binaire — évite le 406 DRF sur Accept: application/pdf."""

    permission_classes = [permissions.IsAuthenticated, IsActif, IsJeune]
    renderer_classes = [JSONRenderer, PDFFileRenderer, AnyFileRenderer]

    def get(self, request, pk):
        from .services.certificates import ensure_certificate_file

        cert = (
            Certificate.objects.filter(pk=pk, jeune=request.user)
            .select_related('stage', 'stage__communaute')
            .first()
        )
        if not cert:
            return Response({'detail': 'Brevet introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            cert = ensure_certificate_file(cert)
            handle = cert.fichier.open('rb')
        except (FileNotFoundError, OSError, ValueError) as exc:
            raise Http404('Fichier brevet introuvable.') from exc

        # Aperçu navigateur (iframe) vs téléchargement forcé
        as_attachment = request.query_params.get('download', '1') not in ('0', 'false', 'preview')

        return FileResponse(
            handle,
            as_attachment=as_attachment,
            filename=f'brevet-{cert.stage.code.lower()}.pdf',
            content_type='application/pdf',
        )


# ── CG ──────────────────────────────────────────────────────────────


class CGFormationsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsActif, IsCG]

    def get(self, request):
        from accounts.models import Role, StatutCompte, User
        from .models import FormationProgress

        jeunes = User.objects.filter(
            role=Role.JEUNE,
            statut=StatutCompte.ACTIF,
            groupe_id=request.user.groupe_id,
        ).select_related('etape_courante')
        rows = []
        for jeune in jeunes:
            progs = FormationProgress.objects.filter(jeune=jeune).select_related('stage')
            rows.append(
                {
                    'jeune_id': jeune.id,
                    'nom_complet': jeune.nom_complet,
                    'email': jeune.email,
                    'etape_courante': jeune.etape_courante_id,
                    'etape_courante_titre': (
                        jeune.etape_courante.titre if jeune.etape_courante_id else None
                    ),
                    'progressions': FormationProgressSerializer(progs, many=True).data,
                }
            )
        return Response(rows)
