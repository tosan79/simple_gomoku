import subprocess
import random
import json

N = 15

class Game:
    def __init__(self):
        self.board = [['.' for _ in range(N)] for _ in range(N)]
        self.process1 = subprocess.Popen(['./agent1'],
                                       stdin=subprocess.PIPE,
                                       stdout=subprocess.PIPE,
                                       text=True,
                                       bufsize=1)

        self.process2 = subprocess.Popen(['./agent2'],
                                       stdin=subprocess.PIPE,
                                       stdout=subprocess.PIPE,
                                       text=True,
                                       bufsize=1)

        # Wait for ready messages
        assert self.process1.stdout != None
        assert self.process2.stdout != None
        ready1 = self.process1.stdout.readline().strip()
        ready2 = self.process2.stdout.readline().strip()
        print(f"Process 1: {ready1}")
        print(f"Process 2: {ready2}")

        # Randomly decide who plays first
        self.curr = random.choice([self.process1, self.process2])
        if self.curr == self.process1:
            self.next = self.process2
            print("(process1 has been assigned O). ", end='')
        else:
            self.next = self.process1
            print("(process2 has been assigned O). ", end='')
        self.curr_symbol = 'O'  # First player is always O
        print("Game initialized")

    def check_win(self, x, y, symbol):
        directions = [
            [(0, 1)],  # horizontal
            [(1, 0)],  # vertical
            [(1, 1)],  # diagonal \
            [(1, -1)]  # diagonal /
        ]

        for dir in directions:
            dx, dy = dir[0]
            count = 1  # count the piece we just placed

            # Check in positive direction
            i, j = x + dx, y + dy
            while 0 <= i < N and 0 <= j < N and self.board[i][j] == symbol:
                count += 1
                i += dx
                j += dy

            # Check in negative direction
            i, j = x - dx, y - dy
            while 0 <= i < N and 0 <= j < N and self.board[i][j] == symbol:
                count += 1
                i -= dx
                j -= dy

            if count >= 5:
                return True
        return False

    def print_board(self):
        print("\nCurrent board state:")
        for row in self.board:
            print(' '.join(row))
        print()

    def run_game(self):
        moves_list = []
        try:
            print("Sending start signal...")
            assert self.curr.stdin != None
            self.curr.stdin.write("start\n")
            self.curr.stdin.flush()

            moves_count = 0
            while moves_count < N**2:
                print(f"\nWaiting for player {self.curr_symbol}'s move...")
                assert self.curr.stdout != None
                move = self.curr.stdout.readline().strip()
                print(f"Received move: {move}")

                try:
                    x, y = map(int, move.split())
                    if 0 <= x < N and 0 <= y < N and self.board[x][y] == '.':
                        self.board[x][y] = self.curr_symbol
                        print(f"Player {self.curr_symbol} placed at: {x}, {y}")
                        self.print_board()
                        moves_list.append([x, y])
                    else:
                        print(f"Invalid move: {x}, {y}")
                        break
                except ValueError:
                    print(f"Invalid move format: {move}")
                    break

                # Check for win
                if self.check_win(x, y, self.curr_symbol):
                    print(f"Player {self.curr_symbol} wins!")
                    break

                moves_count += 1

                assert self.next.stdin != None
                self.next.stdin.write(f"{move}\n")
                self.next.stdin.flush()

                # Swap players
                self.curr, self.next = self.next, self.curr
                self.curr_symbol = 'X' if self.curr_symbol == 'O' else 'O'

        except KeyboardInterrupt:
            print("\nGame interrupted by user")
        finally:
            print("Cleaning up...")
            game_data = {
                'moves': moves_list,
                'first_player': 'process1' if self.curr == self.process1 else 'process2'
            }
            with open('moves_demo.json', 'w') as f:
                json.dump(game_data, f)
            assert self.process1.stdin != None
            assert self.process2.stdin != None
            self.process1.stdin.write("end\n")
            self.process2.stdin.write("end\n")
            self.process1.stdin.flush()
            self.process2.stdin.flush()
            self.process1.terminate()
            self.process2.terminate()
            self.process1.wait()
            self.process2.wait()

if __name__ == "__main__":
    game = Game()
    game.run_game()
