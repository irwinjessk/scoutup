from rest_framework import serializers

from .models import Evaluation, EvaluationAnswer, EvaluationAttempt, EvaluationQuestion


class EvaluationQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationQuestion
        fields = ('id', 'evaluation', 'type', 'enonce', 'options', 'reponse_attendue', 'points', 'ordre')
        read_only_fields = ('id', 'evaluation')


class EvaluationQuestionPublicSerializer(serializers.ModelSerializer):
    """Sans reponse_attendue — jamais exposée au client avant clôture."""

    class Meta:
        model = EvaluationQuestion
        fields = ('id', 'type', 'enonce', 'options', 'points', 'ordre')


class EvaluationQuestionInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationQuestion
        fields = ('type', 'enonce', 'options', 'reponse_attendue', 'points', 'ordre')


class EvaluationSerializer(serializers.ModelSerializer):
    nb_questions = serializers.IntegerField(source='questions.count', read_only=True)
    nb_participants = serializers.IntegerField(source='attempts.count', read_only=True)

    class Meta:
        model = Evaluation
        fields = (
            'id',
            'titre',
            'duree_minutes',
            'statut',
            'published_at',
            'closes_at',
            'created_at',
            'nb_questions',
            'nb_participants',
        )
        read_only_fields = ('id', 'statut', 'published_at', 'closes_at', 'created_at')


def _replace_questions(evaluation, questions_data):
    evaluation.questions.all().delete()
    for idx, question in enumerate(questions_data, start=1):
        if not question.get('ordre'):
            question['ordre'] = idx
        EvaluationQuestion.objects.create(evaluation=evaluation, **question)


def _validate_non_empty_questions(value):
    if not value:
        raise serializers.ValidationError('Ajoute au moins une question.')
    return value


class EvaluationCreateSerializer(serializers.ModelSerializer):
    questions = EvaluationQuestionInputSerializer(many=True)

    class Meta:
        model = Evaluation
        fields = ('titre', 'duree_minutes', 'questions')

    def validate_questions(self, value):
        return _validate_non_empty_questions(value)

    def create(self, validated_data):
        questions_data = validated_data.pop('questions')
        request = self.context['request']
        evaluation = Evaluation.objects.create(
            communaute_id=request.user.communaute_id,
            created_by=request.user,
            **validated_data,
        )
        _replace_questions(evaluation, questions_data)
        return evaluation


class EvaluationDetailSerializer(serializers.ModelSerializer):
    """Détail complet d'un brouillon — questions avec reponse_attendue, pour réouverture."""

    questions = EvaluationQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Evaluation
        fields = ('id', 'titre', 'duree_minutes', 'statut', 'questions')


class EvaluationUpdateSerializer(serializers.ModelSerializer):
    """Réenregistrement complet d'un brouillon (titre, durée et banque de questions)."""

    questions = EvaluationQuestionInputSerializer(many=True)

    class Meta:
        model = Evaluation
        fields = ('titre', 'duree_minutes', 'questions')

    def validate_questions(self, value):
        return _validate_non_empty_questions(value)

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        _replace_questions(instance, questions_data)
        return instance


class EvaluationAttemptResultSerializer(serializers.ModelSerializer):
    """Une ligne du tableau de résultats CC : note, temps, présence."""

    jeune_id = serializers.IntegerField(source='jeune.id', read_only=True)
    nom_complet = serializers.CharField(source='jeune.nom_complet', read_only=True)
    email = serializers.CharField(source='jeune.email', read_only=True)
    temps_minutes = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationAttempt
        fields = (
            'jeune_id',
            'nom_complet',
            'email',
            'score',
            'score_max',
            'present',
            'started_at',
            'submitted_at',
            'temps_minutes',
        )

    def get_temps_minutes(self, obj):
        if obj.started_at and obj.submitted_at:
            return round((obj.submitted_at - obj.started_at).total_seconds() / 60, 1)
        return None


class EvaluationAnswerDetailSerializer(serializers.ModelSerializer):
    """Détail question par question d'une réponse notée — utilisé pour le correctif CC/jeune."""

    question_id = serializers.IntegerField(source='question.id', read_only=True)
    type = serializers.CharField(source='question.type', read_only=True)
    enonce = serializers.CharField(source='question.enonce', read_only=True)
    options = serializers.JSONField(source='question.options', read_only=True)
    reponse_attendue = serializers.JSONField(source='question.reponse_attendue', read_only=True)
    points_max = serializers.IntegerField(source='question.points', read_only=True)

    class Meta:
        model = EvaluationAnswer
        fields = (
            'question_id',
            'type',
            'enonce',
            'options',
            'reponse_attendue',
            'points_max',
            'reponse',
            'est_correcte',
            'points_obtenus',
        )


class JeuneEvaluationAttemptSerializer(serializers.ModelSerializer):
    """Historique d'une tentative, côté jeune."""

    evaluation_titre = serializers.CharField(source='evaluation.titre', read_only=True)

    class Meta:
        model = EvaluationAttempt
        fields = ('id', 'evaluation', 'evaluation_titre', 'score', 'score_max', 'submitted_at')
