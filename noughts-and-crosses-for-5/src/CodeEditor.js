import Editor from "@monaco-editor/react";

// const defaultCode = `#include <iostream>
// #include <string>

// #define N 15

// class Board {
// public:
//     char board[N][N];

//     Board() {
//         for (int i = 0; i < N; i++)
//             for (int j = 0; j < N; j++)
//                 board[i][j] = '.';
//     }

//     void make_move(int x, int y, char player) {
//         board[x][y] = player;
//         std::cout << x << " " << y << std::endl;
//         std::cout.flush();
//     }

//     // Add your game logic here!
// };

// int main() {
//     Board b;
//     char player;
//     std::string line;

//     std::cout << "ready\\n";
//     std::cout.flush();

//     std::getline(std::cin, line);
//     if (line == "start") {
//         player = 'O';
//         // Make your first move here
//         b.make_move(N/2, N/2, player);  // Example: start in center
//     } else {
//         player = 'X';
//         // Handle opponent's move and make your move
//         int x, y;
//         sscanf(line.c_str(), "%d %d", &x, &y);
//         b.read_opponents_move(x, y);
//         b.make_move(x, N-1-y, player);  // Example: mirror move
//     }

//     while (true) {
//         std::getline(std::cin, line);
//         if (line == "end") return 0;

//         // Add your game loop logic here
//         int x, y;
//         sscanf(line.c_str(), "%d %d", &x, &y);
//         b.read_opponents_move(x, y);
//         b.make_move(x, N-1-y, player);  // Example: mirror move
//     }

//     return 0;
// }`;

const defaultCode = `#include <iostream>
#include <sstream>
#include <string>

#define N 15

class Board {
  public:
    char board[N][N];

    Board() {
      for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
          board[i][j] = '.';
    }

    void make_move(int x, int y, char player) {
      board[x][y] = player;
      std::cout << x << " " << y << std::endl;
      std::cout.flush();
    }

    char switch_player(char player) {
      return player == 'O' ? 'X' : 'O';
    }

    void random_move(char player) {
      std::srand(time(nullptr));

      int x, y;
      do {
        x = std::rand() % N;
        y = std::rand() % N;
      } while (board[x][y] != '.');

      make_move(x, y, player);
    }

    void read_opponents_move(char player, const std::string &str) {
      std::istringstream iss(str);
      int x, y;
      iss >> x >> y;
      board[x][y] = switch_player(player);
    }
};

int main() {
  Board b;
  char player;
  std::string line;

  std::cout << "ready" << std::endl;
  std::cout.flush();

  // first line (assign the pieces to players, 'O' goes first)
  std::getline(std::cin, line);
  if (line == "start") {
    player = 'O';
    b.random_move(player);
  } else {
    player = 'X';
    b.read_opponents_move(player, line);
    b.random_move(player);
  }

  while (true) {
    std::getline(std::cin, line);

    if (line == "end") return 0;
    if (line.empty() && player == 'X') return 1;

    b.read_opponents_move(player, line);
    b.random_move(player);
  }

  return 0;
}`;

function CodeEditor({ code, onChange, height = "600px" }) {
    return (
        <Editor
            height={height}
            defaultLanguage="cpp"
            theme="vs-dark"
            value={code || defaultCode}
            onChange={onChange}
            options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: "on",
                automaticLayout: true,
                formatOnPaste: true,
                formatOnType: true,
            }}
        />
    );
}

export default CodeEditor;
