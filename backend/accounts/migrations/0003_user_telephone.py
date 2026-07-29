from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='telephone',
            field=models.CharField(
                blank=True,
                help_text='Numéro au format international E.164 (ex. +2250700000000)',
                max_length=20,
                null=True,
                unique=True,
                verbose_name='téléphone',
            ),
        ),
    ]
