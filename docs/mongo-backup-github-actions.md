# Backup MongoDB su Backblaze B2 (GitHub Actions)

Questa configurazione crea un dump MongoDB ogni 24h, lo comprime in `.zip` e lo carica su Backblaze B2.

## 1) Secrets da configurare su GitHub
Repository -> Settings -> Secrets and variables -> Actions -> New repository secret

- `MONGO_URI`
- `B2_ENDPOINT` (es. `https://s3.us-east-005.backblazeb2.com`)
- `B2_REGION` (es. `us-east-005`)
- `B2_KEY_ID`
- `B2_APP_KEY`
- `B2_BUCKET_NAME`

Opzionali:
- `B2_PREFIX` (default: `mongo-backups/`)
- `BACKUP_RETENTION_DAYS` (default: `30`)

## 2) Workflow
File già pronto:
- `.github/workflows/mongo-backup-b2.yml`

Fa:
1. install dipendenze backend
2. install `mongodump`
3. dump + zip
4. upload su B2
5. retention sul bucket (cancella backup più vecchi dei giorni impostati)

## 3) Esecuzione
- Manuale: tab **Actions** -> `Mongo Backup to Backblaze B2` -> **Run workflow**
- Automatica: ogni giorno alle `01:30 UTC` (cron modificabile nel file workflow)

## 4) Verifica
- Controlla i log del job in Actions
- Controlla il bucket B2 nel prefisso `mongo-backups/` (o quello impostato)

## 5) Nota sicurezza
- Non salvare chiavi in `.env` del repo
- Usa solo GitHub Secrets
