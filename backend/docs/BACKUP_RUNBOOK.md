# Backup DB - Runbook

## Configurazione minima
- Il progetto usa `MONGO_URI` da `backend/.env`.
- Script backup: `backend/scripts/mongo-backup.ps1`.
- Output default: `backend/backups/`.

## Esecuzione manuale
```powershell
powershell -ExecutionPolicy Bypass -File backend/scripts/mongo-backup.ps1 -RetentionDays 30
```

## Scheduler giornaliero (Windows - Task Scheduler)
- Programma: `powershell.exe`
- Argomenti: `-ExecutionPolicy Bypass -File "C:\Users\Mary Hannoush\Documents\GitHub\Elave-platform\backend\scripts\mongo-backup.ps1" -RetentionDays 30`
- Trigger: ogni giorno (es. 02:00)

## Procedura operativa (5 righe)
1. Ogni giorno alle 02:00 gira `mongo-backup.ps1` con retention 30 giorni.  
2. Il dump viene creato con `mongodump` e salvato in ZIP timestampato.  
3. I backup più vecchi della retention vengono cancellati automaticamente.  
4. Ogni settimana si esegue un restore di test su DB non produttivo.  
5. Prima di import massivi/rilasci si lancia un backup manuale immediato.
