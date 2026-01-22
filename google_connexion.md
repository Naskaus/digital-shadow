📋 Rapport Complet de Connexion Google Sheets
1. Compte de Service (Service Account)
Paramètre	Valeur
Type	service_account
Projet Google Cloud	n8n-digital-shadow
Email du Service Account	digital-shadow-import@n8n-digital-shadow.iam.gserviceaccount.com
Client ID	106434225302927733867
Private Key ID	2d9d42ca973885a7ba89e8d54456896dab7e8642
Fichier de Clé	
service_account.json
 (dans le dossier frontend/performances)
2. Google Sheets Configurés
Nom Affiché	Spreadsheet ID	Onglet (Tab)
2026 ALL PERFORMANCES	1CVHurvANYT5j3rpyXnt5IeP6ecMq3Xrhf-olHD1axeI	PERFORMANCES
2025 PERFORMANCES	11mgda-FTk2wHOs7IXTf7hM1qFmvSbcXAdGBNwUt4_ok	DATA_MASTER_2025
URLs Directes :

2026: https://docs.google.com/spreadsheets/d/1CVHurvANYT5j3rpyXnt5IeP6ecMq3Xrhf-olHD1axeI/edit
2025: https://docs.google.com/spreadsheets/d/11mgda-FTk2wHOs7IXTf7hM1qFmvSbcXAdGBNwUt4_ok/edit
3. Fichiers de Configuration
Fichier	Chemin	Rôle
service_account.json	frontend/performances/	Clé privée + authentification Google API
sheets_config.json	frontend/performances/	Liste des feuilles à importer
google_sheets.py	frontend/performances/	Module Python pour l'API Sheets
4. Prérequis pour que ça fonctionne
Partager chaque Google Sheet avec l'email du service account :
digital-shadow-import@n8n-digital-shadow.iam.gserviceaccount.com
→ Donner les droits Lecteur (ou Éditeur si besoin d'écrire).
Activer l'API Google Sheets dans la console Google Cloud :
Projet: n8n-digital-shadow
URL: https://console.cloud.google.com/apis/library/sheets.googleapis.com
Vérifier le nom de l'onglet : Le champ sheet dans sheets_config.json doit correspondre exactement au nom de l'onglet dans Google Sheets (sensible à la casse).
5. Endpoints API Backend
Endpoint	Méthode	Description
/api/import/config	GET	Récupère la config des sheets
/api/import/config	POST	Met à jour la config
/api/import/sheets	GET	Liste les sheets disponibles
/api/import/execute	POST	Lance l'import de toutes les données
6. Clé Privée (Attention: Sensible!)
La clé privée complète se trouve dans service_account.json. Elle est au format PEM et commence par:

-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEF...
-----END PRIVATE KEY-----
⚠️ Ne jamais partager cette clé publiquement. Si elle est compromise, régénérer une nouvelle clé depuis la console Google Cloud.