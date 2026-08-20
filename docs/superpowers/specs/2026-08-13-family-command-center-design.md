# Family Command Center — Design de la V1

Date : 13 août 2026  
Statut : conception approuvée, spécification à valider

## 1. Objectif

Créer une application familiale partagée, installable sur téléphone, qui permet à deux parents de comprendre et mettre à jour l'organisation du foyer en quelques secondes. La priorité n'est pas la richesse technique visible, mais la réduction de la charge mentale quotidienne.

La V1 couvre six espaces : Aujourd'hui, Agenda, Courses, Maison, École et Crèche. Les documents, repas, anniversaires et le suivi administratif détaillé restent hors périmètre pour cette première version.

## 2. Principes produit

- La page Aujourd'hui doit être compréhensible en moins de dix secondes.
- Toute information importante doit pouvoir être ajoutée en trois actions au maximum.
- Les données sont communes au foyer et synchronisées en temps réel entre deux comptes.
- Chaque élément peut appartenir à Florian, à l'autre parent ou à toute la famille.
- Les écrans privilégient des listes lisibles aux indicateurs, graphiques et cartes décoratives.
- La future saisie vocale est anticipée dans les composants et le modèle de données, sans intégrer de service speech-to-text dans la V1.

## 3. Utilisateurs et droits

Deux adultes disposent chacun d'un compte. Ils rejoignent le même foyer via une invitation. Les deux membres ont les mêmes droits sur les données du foyer.

Les règles de sécurité de la base garantissent qu'un utilisateur ne peut lire ou modifier que les données des foyers auxquels il appartient. Aucune donnée d'un autre foyer ne doit être accessible, même par appel direct à l'API.

## 4. Navigation et structure

### Mobile

Une barre inférieure donne accès à Aujourd'hui, Agenda, Courses, Maison et Enfants. L'espace Enfants contient deux onglets : École et Crèche. Un bouton d'ajout contextuel reste facilement accessible au pouce.

### Ordinateur et tablette large

Une barre latérale compacte reprend les mêmes destinations. Le contenu conserve une largeur de lecture limitée et ne devient pas un dashboard dense.

## 5. Écrans

### Aujourd'hui

L'écran s'ouvre sur une salutation courte et la date. Une chronologie unique affiche, dans l'ordre : événements, départs ou retours école/crèche, tâches arrivant à échéance et choses à apporter. Les éléments terminés sont visuellement atténués puis regroupés sous une section repliable.

Un résumé de courses n'apparaît que si des articles restent à acheter. Il indique le nombre d'articles et les trois prochains, avec un accès direct à la liste complète.

Trois raccourcis sont proposés : événement, tâche et article de courses. Un bouton micro inactif mais clairement présenté comme « bientôt » réserve l'emplacement de la future saisie vocale sans promettre une fonction non disponible.

L'écran ne comporte ni statistiques, ni graphiques, ni résumé hebdomadaire.

### Agenda

Deux vues : liste chronologique par défaut et semaine compacte. Les événements peuvent être créés, modifiés et supprimés. Ils comprennent un titre, un début, une fin facultative, un lieu facultatif, une catégorie, un responsable et un rappel facultatif.

Les catégories initiales sont Famille, École, Crèche, Santé et Personnel. Santé sert uniquement à catégoriser un rendez-vous ; aucun dossier médical n'est stocké en V1.

### Courses

La liste partagée est regroupée automatiquement par rayon : Fruits et légumes, Frais, Épicerie, Maison, Bébé et Autre. L'ajout rapide ne demande que le nom ; quantité, rayon et note restent facultatifs.

Cocher un article le déplace dans « Pris ». Une action permet de vider les articles pris. Les mises à jour de l'autre parent apparaissent en temps réel.

### Maison

Les tâches affichent un titre, un responsable, une échéance facultative, une priorité simple et une récurrence facultative. Les vues disponibles sont À faire et Terminées. Les récurrences prévues sont quotidienne, hebdomadaire, mensuelle et personnalisée à intervalle fixe.

Terminer une tâche récurrente crée sa prochaine occurrence sans dupliquer les anciennes occurrences à l'écran.

### École et Crèche

Chaque onglet propose trois listes sobres : À venir, À apporter et Informations. Les éléments comprennent un titre, une date facultative, une note, un responsable et un statut.

Les éléments datés alimentent automatiquement Aujourd'hui et Agenda lorsqu'ils représentent un événement. Les informations simples, sans date, restent uniquement dans leur onglet pour éviter de surcharger la page principale.

## 6. Ajout rapide

Un panneau inférieur commun sert à créer les différents types d'éléments. Il choisit par défaut le type correspondant à l'écran courant et conserve uniquement les champs indispensables visibles. Les détails avancés sont repliés.

Le composant acceptera plus tard une charge utile structurée issue d'une transcription vocale. Par exemple, une commande vocale pourra être transformée en plusieurs créations distinctes avant confirmation. Cette extension ne doit pas imposer de dépendance à un fournisseur d'IA dans la V1.

## 7. Design visuel

Direction : « quotidien calme », chaleureuse, premium et non infantile.

- Fond ivoire très clair.
- Texte principal bleu nuit.
- Vert sauge comme accent principal et couleur d'action.
- Terracotta et bleu doux comme accents réservés aux espaces enfants.
- Typographie sans-serif chaleureuse, très lisible, avec chiffres tabulaires pour les heures.
- Icônes linéaires cohérentes, sans illustration décorative ni emoji utilisé comme icône d'interface.
- Espacement généreux, bordures fines et ombres rares.
- Les cartes ne sont utilisées que pour séparer une action ou un bloc important ; les listes restent ouvertes et aérées.

L'interface respecte les préférences de réduction des animations, les contrastes AA et des cibles tactiles d'au moins 44 pixels.

## 8. Architecture technique

- Frontend : React, TypeScript et Vite.
- Application installable : manifest PWA et service worker pour le shell applicatif.
- Backend : Supabase Auth, Postgres et Realtime.
- État distant : requêtes mises en cache et mises à jour optimistes avec réconciliation serveur.
- Validation : schémas partagés côté formulaire et couche d'accès aux données.
- Hébergement cible : Vercel.

Le code est organisé par fonctionnalités : auth/foyer, today, calendar, shopping, household et children. Les composants visuels communs, la couche Supabase et les types métier restent séparés des écrans.

## 9. Modèle de données

Tables principales :

- `households` : foyer et métadonnées minimales.
- `household_members` : relation entre comptes, foyer et rôle.
- `events` : événements datés de l'agenda.
- `shopping_items` : articles, quantité, rayon et état.
- `tasks` : tâches maison, responsable, priorité et récurrence.
- `child_items` : éléments école/crèche de type événement, chose à apporter ou information.
- `reminders` : date de rappel, état d'envoi et lien vers l'élément concerné.

Chaque donnée métier contient `household_id`, `created_by`, `created_at` et `updated_at`. Les suppressions sont définitives après confirmation dans la V1 ; les actions fréquentes comme cocher un article restent réversibles immédiatement dans l'interface.

## 10. Synchronisation, hors ligne et erreurs

Les créations et modifications sont appliquées immédiatement à l'interface, puis confirmées par le serveur. En cas d'échec, l'état précédent est restauré et un message permet de réessayer.

La V1 met en cache le shell et les dernières données consultées. La consultation reste possible lors d'une coupure courte, mais la création hors ligne avancée avec file d'attente persistante est exclue. L'interface indique clairement l'absence de connexion et évite de prétendre qu'une modification non envoyée est synchronisée.

Les états chargement, vide, erreur, accès refusé et session expirée sont définis pour chaque écran.

## 11. Rappels et notifications

La V1 propose des rappels datés. Les notifications web sont activées uniquement après une demande explicite de permission. Si les notifications ne sont pas disponibles ou refusées, les rappels restent visibles dans Aujourd'hui et l'Agenda.

L'envoi fiable en arrière-plan pourra nécessiter une fonction serveur planifiée. Cette partie sera isolée afin de pouvoir changer de fournisseur sans modifier les écrans métier.

## 12. Données de démonstration et première utilisation

Un mode démo local permet de visualiser l'application sans compte avec un foyer fictif et des données réalistes. Il est clairement séparé du mode connecté et n'envoie aucune donnée.

Après inscription, le premier adulte crée le foyer et invite le second. Un mini-parcours propose d'ajouter un premier événement, une première tâche et un premier article, sans assistant long.

## 13. Tests et critères d'acceptation

- Un membre du foyer voit les modifications de l'autre sans recharger la page.
- Un utilisateur extérieur ne peut lire ni modifier les données du foyer.
- Un événement, une tâche datée et un élément enfant daté apparaissent correctement dans Aujourd'hui.
- Ajouter et cocher un article fonctionne en moins de trois actions sur mobile.
- Terminer une tâche récurrente génère exactement la prochaine occurrence.
- Les cinq destinations principales et tous les formulaires restent utilisables à 375 px de large.
- L'application est navigable au clavier et les contrôles ont des libellés accessibles.
- Les tests automatisés couvrent les transformations de données, la récurrence et les principaux formulaires.
- Le build, le lint et les tests passent avant publication.
- Le flux inscription → création du foyer → invitation → ajout d'un élément est vérifié dans un navigateur.

## 14. Hors périmètre de la V1

- Reconnaissance vocale et interprétation par modèle d'IA.
- Documents familiaux et stockage de fichiers.
- Menus et planification des repas.
- Anniversaires dédiés.
- Dossier de santé ou données médicales sensibles.
- Messagerie entre parents.
- Statistiques de productivité familiale.
- Application native iOS ou Android.

## 15. Évolution speech-to-text

La phase suivante ajoutera un bouton micro au panneau d'ajout. Le flux prévu est : enregistrement volontaire, transcription, extraction structurée des intentions, écran de confirmation, puis création des éléments validés. Aucun enregistrement audio ne sera conservé par défaut. Le fournisseur et le modèle seront choisis selon la latence en français, le coût, la confidentialité et la capacité à distinguer plusieurs actions dans une même phrase.
