# history of writing this program:

1. ran `npx create-react-app noughts-and-crosses-for-5`
2. described board interface
3. configured infrastructure (vm, domain, nginx, systemctl, dmon service)
4. designed logic of agents
5. considerations about server, compilation of programs and the dueler / judge program

------------------

update WTOREK 14.01.2025

dodałem interaktywny 'TEST MODE'
(gra toczy się użytkownik przeglądarki vs 'selected opponent' wybrany na pierwszym ekranie)

* nowy 'ekran' TestMode.js obsługujący klikanie
* program interactive_judge.py który komunikuje klikanie gracza z zaprogramowanymi ruchami admina/randoma
* dostosowanie do tego trybu plików: server.js, WelcomeScreen.js oraz Board.js



update PIĄTEK 24.01.2025
