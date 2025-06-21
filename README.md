Aby zainstalować aplikację należy sklonować repozytorium oraz pobrać Node.js a potem wykonać następujące polecenia:

- Aby zainstalować biblioteki i paczki używane przez serwer, w głównym katalogu repozytorium:

`npm install express multer cors bcrypt jsonwebtoken sqlite3`

a następnie uruchomić serwer:

`node server`

> w systemie Windows może się okazać zakomentowanie jednej z ostatnich linii w pliku server.js o treści:
> app.get("*", (req, res) => {res.sendFile(path.join(__dirname, "noughts-and-crosses-for-5", "build", "index.html"));});

- Aby wyświetlić frontend, w podkatalogu *noughts-and-crosses-for-5* wydać polecenie:

`npm install`

by zainstalować wszystkie zależności z pliku package.json (w tym react-scripts), a następnie zbudować aplikację w środowisku development:

`npm start`
