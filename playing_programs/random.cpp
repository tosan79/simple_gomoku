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

  void print() {
    for (int i = 0; i < N; i++) {
      for (int j = 0; j < N; j++)
        std::cout << board[i][j];
      std::cout << std::endl;
    }
    std::cout << std::endl;
  }

  void make_move(int x, int y, char player) {
    board[x][y] = player;
    std::cout << x << " " << y << std::endl;
    std::cout.flush(); // Make sure to flush the output
  }

  char switch_player(char player) { return player == 'O' ? 'X' : 'O'; }

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

  std::cout << "ready\n"; // Changed from "hello" to "ready"
  std::cout.flush();      // Make sure to flush

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
  // b.print();

  while (true) {
    std::getline(std::cin, line);

    if (line == "end") return 0; // end the game
    if (line.empty() && player == 'X') return 1; // something is wrong with turns

    b.read_opponents_move(player, line);
    b.random_move(player);

    // b.print();
  }

  return 0;
}
