from rest_framework import serializers

from formation.models import QuestionType

from .models import Competition, CompetitionQuestion

MIN_QUESTIONS = 60


class CompetitionQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionQuestion
        fields = ('id', 'competition', 'type', 'enonce', 'options', 'reponse_attendue', 'points', 'ordre')
        read_only_fields = ('id', 'competition')


class CompetitionQuestionPublicSerializer(serializers.ModelSerializer):
    """Sans reponse_attendue — jamais exposée au client avant clôture."""

    class Meta:
        model = CompetitionQuestion
        fields = ('id', 'type', 'enonce', 'options', 'points', 'ordre')


class CompetitionQuestionInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionQuestion
        fields = ('type', 'enonce', 'options', 'reponse_attendue', 'points', 'ordre')

    def validate(self, attrs):
        qtype = attrs.get('type')
        options = attrs.get('options')
        enonce = attrs.get('enonce') or ''

        if qtype == QuestionType.QCM and not options:
            raise serializers.ValidationError({'options': 'Options requises pour un QCM.'})

        if qtype == QuestionType.TEXTE_TROUS:
            from formation.services.grading import count_blanks

            nb = count_blanks(enonce)
            if nb < 1:
                raise serializers.ValidationError(
                    {'enonce': 'Utilise ___ pour chaque trou (ex. La devise est ___).'}
                )
            opts = dict(options or {})
            opts.setdefault('nb_blanks', nb)
            attrs['options'] = opts

        return attrs


class CompetitionSerializer(serializers.ModelSerializer):
    nb_questions = serializers.IntegerField(source='questions.count', read_only=True)
    nb_participants = serializers.IntegerField(source='attempts.count', read_only=True)

    class Meta:
        model = Competition
        fields = (
            'id',
            'titre',
            'duree_jours',
            'statut',
            'published_at',
            'closes_at',
            'created_at',
            'nb_questions',
            'nb_participants',
            'partage_token',
        )
        read_only_fields = (
            'id',
            'statut',
            'published_at',
            'closes_at',
            'created_at',
            'partage_token',
        )


def _replace_questions(competition, questions_data):
    competition.questions.all().delete()
    for idx, question in enumerate(questions_data, start=1):
        if not question.get('ordre'):
            question['ordre'] = idx
        CompetitionQuestion.objects.create(competition=competition, **question)


def _validate_min_questions(value):
    if len(value) < MIN_QUESTIONS:
        raise serializers.ValidationError(
            f'Le cahier des charges exige une banque d’au moins {MIN_QUESTIONS} questions '
            f'({len(value)} fournie{"s" if len(value) > 1 else ""}).'
        )
    return value


class CompetitionCreateSerializer(serializers.ModelSerializer):
    questions = CompetitionQuestionInputSerializer(many=True)

    class Meta:
        model = Competition
        fields = ('titre', 'duree_jours', 'questions')

    def validate_questions(self, value):
        return _validate_min_questions(value)

    def create(self, validated_data):
        questions_data = validated_data.pop('questions')
        request = self.context['request']
        competition = Competition.objects.create(
            communaute_id=request.user.communaute_id,
            created_by=request.user,
            **validated_data,
        )
        _replace_questions(competition, questions_data)
        return competition


class CompetitionDetailSerializer(serializers.ModelSerializer):
    """Détail complet d'un brouillon — questions avec reponse_attendue, pour réouverture (RF-42)."""

    questions = CompetitionQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Competition
        fields = ('id', 'titre', 'duree_jours', 'statut', 'questions')


class CompetitionUpdateSerializer(serializers.ModelSerializer):
    """Réenregistrement complet d'un brouillon (titre, durée et banque de questions)."""

    questions = CompetitionQuestionInputSerializer(many=True)

    class Meta:
        model = Competition
        fields = ('titre', 'duree_jours', 'questions')

    def validate_questions(self, value):
        return _validate_min_questions(value)

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        _replace_questions(instance, questions_data)
        return instance
