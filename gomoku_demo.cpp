#include <iostream>
#include <ctime>
#include <cstdlib>

#define N 15

class Board {
public:
    char board[N][N];
    int last_move[2];
    //unsigned int current_player; // either 0 ('O') or 1 ('X')

    Board() {
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < N; j++) {
                board[i][j] = '.';
            }
        }
    }

    void print() {
        for (int i = 0; i < N; i++) {
            for (int j = 0; j < N; j++) {
                std::cout << board[i][j];
            }
            std::cout << std::endl;
        }
        std::cout << std::endl;
    }

    void make_move(int x, int y, char player) {
        board[x][y] = player;
    }

    bool checkWin(int x, int y, char player) {
        int dx[] = {-1, 0, 1, 1};
        int dy[] = {1, 1, 1, 0};

        for (int dir = 0; dir < 4; ++dir) {
            int count = 0;
            for (int i = -4; i <= 4; ++i) {
                int nx = x + i * dx[dir];
                int ny = y + i * dy[dir];
                if (nx >= 0 && nx < N && ny >= 0 && ny < N && board[nx][ny] == player) {
                    if (++count == 5) return true;
                } else {
                    count = 0;
                }
            }
        }

        return false;
    }

    void log_move() {
        std::cout << "[" << last_move[0] << ", " << last_move[1] << "], " << std::endl;
    }

    char switch_player(char player) {
        return player == 'O' ? 'X' : 'O';
    }
};

// make_random_move() function could be kind of an interface
// for a person writing a bot to communicate with the game itself
void make_random_move(Board &B, char player) {
    std::srand(std::time(nullptr));

    int x, y;
    do {
        x = std::rand() % N;
        y = std::rand() % N;
    } while (B.board[x][y] != '.');

    B.make_move(x, y, player);
    B.last_move[0] = x;
    B.last_move[1] = y;
}

int main() {
    std::cout << "[";

    Board B;

    while (true) {
        make_random_move(B, 'O'); // 'O' starts always
        if (B.checkWin(B.last_move[0], B.last_move[1], 'O')) {
            std::cout << "[" << B.last_move[0] << ", " << B.last_move[1] << "]";
            break;
        }
        B.log_move();

        make_random_move(B, 'X');
        if (B.checkWin(B.last_move[0], B.last_move[1], 'X')) {
            std::cout << "[" << B.last_move[0] << ", " << B.last_move[1] << "]";
            break;
        }
        B.log_move();
    }

        std::cout << "]" << std::endl;
}
