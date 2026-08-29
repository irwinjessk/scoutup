from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from formation.models import Stage
from organization.models import Communaute

from .models import Role, StatutCompte

User = get_user_model()


class RegisterSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=[Role.JEUNE, Role.CC])
    nom = serializers.CharField(max_length=80)
    prenoms = serializers.CharField(max_length=120)
    date_naissance = serializers.DateField()
    genre = serializers.ChoiceField(choices=['M', 'F'], required=False, allow_blank=True)
    email = serializers.EmailField()
    telephone = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    communaute_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Cet email est déjà utilisé.')
        return value.lower()

    def validate_telephone(self, value):
        phone = (value or '').strip().replace(' ', '')
        if not phone.startswith('+') or not phone[1:].isdigit() or len(phone) < 10:
            raise serializers.ValidationError(
                'Numéro invalide. Utilise le format international (ex. +2250700000000).'
            )
        if User.objects.filter(telephone=phone).exists():
            raise serializers.ValidationError('Ce numéro est déjà utilisé.')
        return phone

    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {'password_confirm': 'Les mots de passe ne correspondent pas.'}
            )

        role = attrs['role']
        communaute_id = attrs.get('communaute_id')

        if role in (Role.JEUNE, Role.CC):
            if not communaute_id:
                raise serializers.ValidationError(
                    {'communaute_id': 'La communauté est requise.'}
                )
            if not Communaute.objects.filter(pk=communaute_id).exists():
                raise serializers.ValidationError(
                    {'communaute_id': 'Communauté introuvable.'}
                )

        return attrs

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        communaute_id = validated_data.pop('communaute_id', None)

        user = User(**validated_data, statut=StatutCompte.EN_ATTENTE)

        if communaute_id:
            communaute = Communaute.objects.select_related('groupe').get(pk=communaute_id)
            user.communaute = communaute
            user.groupe = communaute.groupe

        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    nom_complet = serializers.CharField(read_only=True)
    is_actif = serializers.BooleanField(read_only=True)
    foulard = serializers.SerializerMethodField()
    etape_placee = serializers.SerializerMethodField()
    etape_courante_titre = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'telephone',
            'role',
            'statut',
            'nom',
            'prenoms',
            'nom_complet',
            'date_naissance',
            'genre',
            'avatar',
            'groupe',
            'communaute',
            'etape_courante',
            'etape_courante_titre',
            'etape_placee',
            'etape_placee_le',
            'auth_provider',
            'is_actif',
            'foulard',
            'created_at',
        )
        read_only_fields = fields

    def get_etape_placee(self, obj):
        return bool(obj.etape_placee_le)

    def get_etape_courante_titre(self, obj):
        if obj.etape_courante_id:
            return obj.etape_courante.titre
        return None

    def get_foulard(self, obj):
        if obj.role != Role.JEUNE:
            return None
        try:
            from gamification.services import get_or_create_scarf, serialize_scarf, sync_recoveries

            return serialize_scarf(sync_recoveries(get_or_create_scarf(obj)))
        except Exception:
            return None


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('nom', 'prenoms', 'telephone', 'date_naissance', 'genre', 'avatar')

    def validate_telephone(self, value):
        phone = (value or '').strip().replace(' ', '')
        if not phone.startswith('+') or not phone[1:].isdigit() or len(phone) < 10:
            raise serializers.ValidationError(
                'Numéro invalide. Utilise le format international (ex. +2250700000000).'
            )
        qs = User.objects.filter(telephone=phone)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Ce numéro est déjà utilisé.')
        return phone


class JeuneListSerializer(serializers.ModelSerializer):
    nom_complet = serializers.CharField(read_only=True)
    etape_courante_titre = serializers.SerializerMethodField()
    etape_placee = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'telephone',
            'nom',
            'prenoms',
            'nom_complet',
            'statut',
            'etape_courante',
            'etape_courante_titre',
            'etape_placee',
            'etape_placee_le',
            'created_at',
            'valide_le',
        )

    def get_etape_courante_titre(self, obj):
        return obj.etape_courante.titre if obj.etape_courante_id else None

    def get_etape_placee(self, obj):
        return bool(obj.etape_placee_le)


class CCListSerializer(serializers.ModelSerializer):
    nom_complet = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = (
            'id',
            'email',
            'telephone',
            'nom',
            'prenoms',
            'nom_complet',
            'statut',
            'communaute',
            'groupe',
            'created_at',
            'valide_le',
        )


class EtapeCouranteSerializer(serializers.Serializer):
    etape_id = serializers.IntegerField()

    def validate_etape_id(self, value):
        user = self.context['request'].user
        if not user.communaute_id:
            raise serializers.ValidationError('Aucune communauté rattachée.')
        try:
            stage = Stage.objects.get(pk=value, communaute_id=user.communaute_id, actif=True)
        except Stage.DoesNotExist as exc:
            raise serializers.ValidationError('Étape introuvable pour ta communauté.') from exc
        return stage.pk

    def save(self, **kwargs):
        from formation.services import FormationError, place_jeune_at_stage

        user = self.context['request'].user
        stage = Stage.objects.get(pk=self.validated_data['etape_id'])
        try:
            return place_jeune_at_stage(user, stage, by_cc=False)
        except FormationError as exc:
            raise serializers.ValidationError(exc.message) from exc


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
            'nb_questions_parcours',
            'actif',
        )


class AssignEtapeSerializer(serializers.Serializer):
    etape_id = serializers.IntegerField()

    def validate(self, attrs):
        jeune = self.context['jeune']
        cc = self.context['request'].user
        if jeune.communaute_id != cc.communaute_id:
            raise serializers.ValidationError('Ce jeune n’appartient pas à ta communauté.')
        try:
            stage = Stage.objects.get(
                pk=attrs['etape_id'],
                communaute_id=cc.communaute_id,
                actif=True,
            )
        except Stage.DoesNotExist as exc:
            raise serializers.ValidationError({'etape_id': 'Étape introuvable.'}) from exc
        attrs['stage'] = stage
        return attrs

    def save(self, **kwargs):
        from formation.services import FormationError, place_jeune_at_stage

        jeune = self.context['jeune']
        try:
            return place_jeune_at_stage(
                jeune,
                self.validated_data['stage'],
                by_cc=True,
            )
        except FormationError as exc:
            raise serializers.ValidationError(exc.message) from exc



def activer_compte(user, validateur):
    user.statut = StatutCompte.ACTIF
    user.valide_par = validateur
    user.valide_le = timezone.now()
    user.save(update_fields=['statut', 'valide_par', 'valide_le', 'updated_at'])
    return user


def refuser_compte(user, validateur):
    user.statut = StatutCompte.REFUSE
    user.valide_par = validateur
    user.valide_le = timezone.now()
    user.save(update_fields=['statut', 'valide_par', 'valide_le', 'updated_at'])
    return user
