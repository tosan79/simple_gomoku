#include <iostream>
#include <sstream>
#include <string>
#include <sys/wait.h>

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
    std::cout.flush();
  }

  char switch_player(char player) { return player == 'O' ? 'X' : 'O'; }

  // Helper function to check if coordinates are within board bounds
  bool is_valid_position(int x, int y) {
    return x >= 0 && x < N && y >= 0 && y < N;
  }

  // Helper function to count consecutive pieces in a direction
  int count_direction(int x, int y, int dx, int dy, char player) {
    int count = 0;
    int curr_x = x + dx;
    int curr_y = y + dy;

    while (is_valid_position(curr_x, curr_y) &&
           board[curr_x][curr_y] == player) {
      count++;
      curr_x += dx;
      curr_y += dy;
    }
    return count;
  }

  // Check if position is empty and has adjacent pieces
  bool has_adjacent_piece(int x, int y) {
    for (int dx = -1; dx <= 1; dx++) {
      for (int dy = -1; dy <= 1; dy++) {
        if (dx == 0 && dy == 0)
          continue;
        int new_x = x + dx;
        int new_y = y + dy;
        if (is_valid_position(new_x, new_y) && board[new_x][new_y] != '.') {
          return true;
        }
      }
    }
    return false;
  }

  void smart_move(char player) {
    char opponent = switch_player(player);
    int best_score = -1;
    int best_x = -1;
    int best_y = -1;

    // Check all possible positions
    for (int i = 0; i < N; i++) { // START FROM N/2 TO N, THEN FROM 0 TO N/2 - 1
      for (int j = 0; j < N; j++) {
        if (board[i][j] != '.')
          continue;
        if (!has_adjacent_piece(i, j) && best_score > 0)
          continue;

        // Check all 8 directions
        int directions[8][2] = {{-1, -1}, {-1, 0}, {-1, 1}, {0, -1},
                                {0, 1},   {1, -1}, {1, 0},  {1, 1}};

        for (auto [dx, dy] : directions) {
          // Count our pieces
          int score = count_direction(i, j, dx, dy, player) +
                      count_direction(i, j, -dx, -dy, player);

          // Check if we can win or need to block
          int opponent_score = count_direction(i, j, dx, dy, opponent) +
                               count_direction(i, j, -dx, -dy, opponent);

          // Prioritize blocking opponent's winning move
          if (opponent_score >= 3) {
            score = opponent_score + 1;
          }

          if (score > best_score) {
            best_score = score;
            best_x = i;
            best_y = j;
          }
        }
      }
    }

    // If we found a move, make it
    if (best_x != -1 && best_y != -1) {
      make_move(best_x, best_y, player);
    } else {
      // If no good move found, play in the center or near the last move
      if (board[N / 2][N / 2] == '.') {
        make_move(N / 2, N / 2, player);
      } else {
        // Find the nearest empty spot to the center
        for (int d = 1; d < N; d++) {
          for (int i = -d; i <= d; i++) {
            for (int j = -d; j <= d; j++) {
              int x = N / 2 + i;
              int y = N / 2 + j;
              if (is_valid_position(x, y) && board[x][y] == '.') {
                make_move(x, y, player);
                return;
              }
            }
          }
        }
      }
    }
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
  } else {
    player = 'X';
    b.read_opponents_move(player, line);
  }

  // first moves of (each) player:
  b.smart_move(player);

  // rest of the game rolls:
  while (true) {
    std::getline(std::cin, line);

    if (line == "end")
      return 0; // end the game
    if (line.empty() && player == 'X')
      return 1; // something is wrong with turns

    b.read_opponents_move(player, line);
    b.smart_move(player);
  }

  return 0;
}
