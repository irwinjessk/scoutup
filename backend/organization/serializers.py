from rest_framework import serializers

from .models import Communaute, Groupe


class GroupeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Groupe
        fields = ('id', 'nom', 'district', 'region')


class CommunauteSerializer(serializers.ModelSerializer):
    groupe = GroupeSerializer(read_only=True)

    class Meta:
        model = Communaute
        fields = ('id', 'nom', 'branche', 'groupe')
