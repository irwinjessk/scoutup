from rest_framework import generics, permissions

from .models import Communaute
from .serializers import CommunauteSerializer


class CommunauteListView(generics.ListAPIView):
    """Liste publique des communautés (inscription jeune / CC)."""

    permission_classes = [permissions.AllowAny]
    serializer_class = CommunauteSerializer
    queryset = Communaute.objects.select_related('groupe').all()
