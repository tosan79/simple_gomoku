import subprocess
import sys
import json
import time

N = 15

class Game:
    def __init__(self, player1, player2, player1_piece):
        print(f"Starting game: {player1} vs {player2}", file=sys.stderr)

        self.process1 = subprocess.Popen([f'./{player1}'],
                                       stdin=subprocess.PIPE,
                                       stdout=subprocess.PIPE,
                                       text=True,
                                       bufsize=1)

        self.process2 = subprocess.Popen([f'./{player2}'],
                                       stdin=subprocess.PIPE,
                                       stdout=subprocess.PIPE,
                                       text=True,
                                       bufsize=1)

        self.moves = []
        self.board = [[' ' for _ in range(N)] for _ in range(N)]

        # Wait for ready messages
        assert self.process1.stdout != None
        assert self.process2.stdout != None
        ready1 = self.process1.stdout.readline().strip()
        ready2 = self.process2.stdout.readline().strip()
        print(f"Player 1 ready: {ready1}", file=sys.stderr)
        print(f"Player 2 ready: {ready2}", file=sys.stderr)

        # Important change: Initialize processes based on who plays 'O'
        if player1_piece == 'O':
            self.first_process = self.process1
            self.second_process = self.process2
        else:
            self.first_process = self.process2
            self.second_process = self.process1

        # Always send 'start' to the process that plays 'O'
        assert self.first_process.stdin != None
        self.first_process.stdin.write("start\n")
        self.first_process.stdin.flush()

        # Get first move from O player
        assert self.first_process.stdout != None
        first_move = self.first_process.stdout.readline().strip()
        print(f"First move received: {first_move}", file=sys.stderr)

        try:
            x, y = map(int, first_move.split())
            if 0 <= x < N and 0 <= y < N and self.board[x][y] == ' ':
                self.board[x][y] = 'O'
                self.moves.append({
                    "x": x,
                    "y": y,
                    "symbol": 'O'
                })
                # Send this move to X player
                assert self.second_process.stdin != None
                self.second_process.stdin.write(f"{x} {y}\n")
                self.second_process.stdin.flush()
            else:
                raise Exception(f"Invalid first move: {x},{y}")
        except ValueError:
            raise Exception(f"Invalid move format: {first_move}")

        self.current_process = self.second_process
        self.other_process = self.first_process
        self.current_symbol = 'X'

    def play_game(self):
        try:
            while True:
                # Get move from current process
                assert self.current_process.stdout != None
                move = self.current_process.stdout.readline().strip()
                print(f"Received move: {move}", file=sys.stderr)

                try:
                    x, y = map(int, move.split())
                    if 0 <= x < N and 0 <= y < N and self.board[x][y] == ' ':
                        # Valid move
                        self.board[x][y] = self.current_symbol
                        move_data = {
                            "x": x,
                            "y": y,
                            "symbol": self.current_symbol
                        }
                        self.moves.append(move_data)

                        # Check for win
                        if self.check_win(x, y, self.current_symbol):
                            self.moves[-1]["winner"] = self.current_symbol
                            break

                        # Send move to other process
                        assert self.other_process.stdin != None
                        self.other_process.stdin.write(f"{x} {y}\n")
                        self.other_process.stdin.flush()

                        # Switch players
                        self.current_process, self.other_process = self.other_process, self.current_process
                        self.current_symbol = 'O' if self.current_symbol == 'X' else 'X'

                    else:
                        print(f"Invalid move: {x},{y}", file=sys.stderr)
                        break
                except ValueError:
                    print(f"Invalid move format: {move}", file=sys.stderr)
                    break


            result = {
                "success": True,
                "moves": self.moves,
                "winner": None  # This will be set if there was a winner
            }

            # Check if the last move was a winning move
            if self.moves:
                last_move = self.moves[-1]
                if "winner" in last_move:
                    result["winner"] = last_move["winner"]
                    if "winning_cells" in last_move:
                        result["winning_cells"] = last_move["winning_cells"]
            # Send complete game data
            print(json.dumps(result))
            # print(json.dumps({
            #     "success": True,
            #     "moves": self.moves
            # }))

        finally:
            # Cleanup
            for process in [self.process1, self.process2]:
                try:
                    assert process.stdin != None
                    process.stdin.write("end\n")
                    process.stdin.flush()
                    process.terminate()
                    process.wait(timeout=1)
                except:
                    pass

    def check_win(self, x, y, symbol):
        directions = [[(0, 1)], [(1, 0)], [(1, 1)], [(1, -1)]]
        for dir in directions:
            dx, dy = dir[0]
            count = 1
            cells = [(x, y)]

            # Check in positive direction
            i, j = x + dx, y + dy
            while 0 <= i < N and 0 <= j < N and self.board[i][j] == symbol:
                count += 1
                cells.append((i, j))
                i += dx
                j += dy

            # Check in negative direction
            i, j = x - dx, y - dy
            while 0 <= i < N and 0 <= j < N and self.board[i][j] == symbol:
                count += 1
                cells.append((i, j))
                i -= dx
                j -= dy

            if count >= 5:
                self.moves[-1]["winning_cells"] = cells
                return True
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(json.dumps({"error": "Two player programs required"}))
        sys.exit(1)

    try:
        game = Game(sys.argv[1], sys.argv[2], sys.argv[3])
        game.play_game()
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
