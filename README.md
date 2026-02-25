kahoot_websocket
Commandes Powershells : 
Dans VSCode, ouvrir un premier terminal : (CTRL + J)

Dans ce terminal installer les dépendances avec la commande : npm install
pour ensuite nous allons demarrer le server et pour cela nous devons nous rendre dans le dossier server avec la commande : cd server (cd = change directory) 
ensuite nous allons faire fonctionner ce serveur avec la commande : npx ts-node src/index.ts

Dans un Second terminal que l'on ouvrira en appuyant sur la touche " + " 
Nous allons effectuer la commande : cd host_app 
Puis la commande : npm run dev

Dans un troisième et derniere terminal que l'on ouvrira en appuyant sur la touche " + "

Nous allons effectuer la commande : cd player_app
Puis la commande : npm run dev


Maintenant depuis le terminal ou le serveur est lancé nous avons un code de Quizz qu'il faut rentrer dans l'interface player que l'on a ouverte préalablement. Il faut donc entrer ce code et notre pseudo si l'ont souhaite commencer le quiz. Sur la page serveur apparaitra les questions et les reponses ainsi que le leaderboard. il faudra donc jouer sur l'interface player mais regarder le resultats sur l'interface serveur