from rest_framework import serializers

from .models import Certificate, FormationProgress, Question, QuestionType, Stage


class StageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = (
            'id',
            'code',
            'ordre',
            'titre',
            'description',
            'couleur_brevet',
            'modele_brevet',
            'nb_questions_parcours',
            'actif',
            'communaute',
        )
        read_only_fields = ('id', 'communaute', 'nb_questions_parcours')


class StageUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Stage
        fields = (
            'titre',
            'description',
            'couleur_brevet',
            'modele_brevet',
            'actif',
        )


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = (
            'id',
            'stage',
            'type',
            'enonce',
            'options',
            'reponse_attendue',
            'explication',
            'actif',
            'ordre',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('id', 'stage', 'created_at', 'updated_at')

    def validate(self, attrs):
        qtype = attrs.get('type') or getattr(self.instance, 'type', None)
        options = attrs.get('options', getattr(self.instance, 'options', None))
        enonce = attrs.get('enonce', getattr(self.instance, 'enonce', '') or '')
        if qtype == QuestionType.QCM and not options:
            raise serializers.ValidationError({'options': 'Options requises pour un QCM.'})
        if qtype == QuestionType.TEXTE_TROUS:
            from .services.grading import count_blanks

            nb = count_blanks(enonce)
            if nb < 1:
                raise serializers.ValidationError(
                    {'enonce': 'Utilise ___ pour chaque trou (ex. La devise est ___).'}
                )
            opts = dict(options or {})
            opts['nb_blanks'] = nb
            attrs['options'] = opts
        return attrs


class QuestionPublicSerializer(serializers.ModelSerializer):
    """Sans reponse_attendue (côté jeune)."""

    class Meta:
        model = Question
        fields = ('id', 'stage', 'type', 'enonce', 'options', 'ordre')


class FormationProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormationProgress
        fields = (
            'id',
            'stage',
            'statut',
            'nb_reussies',
            'nb_total',
            'started_at',
            'completed_at',
        )


class CertificateSerializer(serializers.ModelSerializer):
    stage_titre = serializers.CharField(source='stage.titre', read_only=True)
    stage_code = serializers.CharField(source='stage.code', read_only=True)
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = (
            'id',
            'stage',
            'stage_titre',
            'stage_code',
            'nom_affiche',
            'couleur',
            'delivered_at',
            'fichier',
            'download_url',
        )

    def get_download_url(self, obj):
        return f'/api/v1/jeune/brevets/{obj.id}/download/'
