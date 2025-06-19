#include <initializer_list>
#include <iostream>
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

    bool fst = true;

    void first_move(char player) {
        if (fst && board[N/2][N/2] == '.')
            make_move(N/2, N/2, player);
        fst = false;
    }


    void my_move(char player) {
      for (int i = N / 2; i != N / 2 - 1; i = (i + 1) % N)
        for (int j = N / 2; j != N / 2 - 1; j = (j + 1) % N)
          if (board[i][j] == player)
            for (int dx : {-1, 0, 1})
              for (int dy : {-1, 0, 1})
                if (i + dx >= 0 && j + dy >= 0)
                  if (i + dx < N && j + dy < N)
                    if (board[i + dx][j + dy] == '.') {
                      make_move(i + dx, j + dy, player);
                      return;
                    }
      if (fst)
        first_move(player);
      random_move(player);
    }

    void do_nothing() {
      int x = 666;
      return;
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
    // b.random_move(player);
    b.my_move(player);
}

  return 0;
}
