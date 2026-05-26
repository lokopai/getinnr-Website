#!/bin/bash

# Script de déploiement - Migration SQLite vers Supabase PostgreSQL
# Usage: ./deploy.sh

set -e

echo "🚀 Déploiement getInnr - Migration vers Supabase PostgreSQL"

# Vérifier qu'on est dans le bon répertoire
if [ ! -f "package.json" ] || [ ! -d "server" ]; then
    echo "❌ Erreur: Lancez ce script depuis la racine du projet getInnr"
    exit 1
fi

# Vérifier le statut Git
echo "📋 Vérification du statut Git..."
git status --porcelain

# Ajouter tous les fichiers
echo "📦 Ajout des fichiers modifiés..."
git add -A

# Créer le commit
echo "💾 Création du commit..."
git commit -m "Migration vers Supabase PostgreSQL uniquement

- Suppression du support SQLite (server/store.js force DATABASE_URL)
- Support PostgreSQL/Supabase via pg + server/pg-schema.sql
- Mise à jour .env.example (DATABASE_URL obligatoire)
- Nettoyage sommaire ToC (legal-loader.js)
- Toast cookies + activation/désactivation sections landing
- Back-office complet : pages légales + sections + liens footer

BREAKING: DATABASE_URL PostgreSQL maintenant requis.
SQLite n'est plus supporté." || echo "⚠️  Aucun changement à commiter"

# Pousser vers GitHub
echo "🌐 Push vers GitHub..."
git push origin main

echo "✅ Déploiement terminé!"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Sur Vercel, ajouter les variables d'environnement:"
echo "   - DATABASE_URL=postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres"
echo "   - SESSION_SECRET=<chaine-aleatoire-longue>"
echo "   - ADMIN_USERNAME=admin"
echo "   - ADMIN_PASSWORD=<mot-de-passe-fort>"
echo ""
echo "2. Redéployer sur Vercel (automatique si lié au repo)"
echo ""
echo "3. Tester l'admin: https://ton-projet.vercel.app/admin.html"