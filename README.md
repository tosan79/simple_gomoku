Aby zainstalować aplikację należy sklonować repozytorium oraz pobrać Node.js a potem wykonać następujące polecenia:

- Aby zainstalować biblioteki i paczki używane przez serwer, w głównym katalogu repozytorium:

`npm install express multer cors bcrypt jsonwebtoken sqlite3`

a następnie uruchomić serwer:

`node server`

- Aby wyświetlić frontend, w podkatalogu *noughts-and-crosses-for-5* wydać polecenie:

`npm install`

by zainstalować wszystkie zależności z pliku package.json (w tym react-scripts), a następnie zbudować aplikację w środowisku development:

`npm start`


W pliku `data/codingomoku.db` znajduje się baza danych. Zawiera ona trzech domyślnych użytkowników:
- 'profesor' (hasło: 'profesor') - do zarządzania innymi kontami
- 'admin' (hasło: 'admin') - program-boss
- 'random' (hasło: 'random') - losowy gracz

Baza jest uruchamiana automatycznie przez serwer, a programy użytkowników 'admin' i 'random' kompilowane (do tego potrzebny jest zainstalowany lokalnie kompilator g++).
