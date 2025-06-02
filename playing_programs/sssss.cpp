#include <bits/stdc++.h>

using namespace std;

#define N 10

typedef pair<int, int> ii;

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

    void move(char player) {
      ii win = find_win(player);
      if(win.first != -1) {
        return make_move(win.first, win.second, player);
      } else {
        return random_move(player);
      }
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

    ii find_win(char player) {
      vector<int> dirs_1 = {-1, 0, 1};
      vector<ii> dirs_2;
      for(int dx: dirs_1) {
        for(int dy: dirs_1) {
          if(dx == 0 && dy == 0) continue;
          dirs_2.push_back({dx, dy});
        }
      }

      for(int x = 0; x < N; x++) {
        for(int y = 0; y < N; y++) {
          for(ii d: dirs_2) {
            if(check_win_at(player, x, y, d.first, d.second)) {
              return {x, y};
            }
          }
        }
      }

      return {-1, -1};
    }

    int abs(int a) {
      return a > 0 ? a : -a;
    }

    int max(int a, int b) {
      return a > b ? a : b;
    }

    bool check_win_at(char player, int x, int y, int dx, int dy) {
      if(board[x][y] != '.') return false;
      int x1 = x + dx, x2 = x - dx, y1 = y + dx, y2 = y - dx;
      while(0 <= x1 && x1 < N && 0 <= y1 && y1 < N && board[x1][y1] == player) {
        x1 += dx; y1 += dy;
      }
      while(0 <= x2 && x2 < N && 0 <= y2 && y2 < N && board[x2][y2] == player) {
        x2 -= dx; y2 -= dy;
      }
      return max(abs(x2 - x1), abs(y2 - y1)) > 5;
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
    b.move(player);
  } else {
    player = 'X';
    b.read_opponents_move(player, line);
    b.move(player);
  }

  while (true) {
    std::getline(std::cin, line);

    if (line == "end") return 0;
    if (line.empty() && player == 'X') return 1;

    b.read_opponents_move(player, line);
    b.move(player);
}

return 0;
}