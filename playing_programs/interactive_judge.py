import subprocess
import json
import sys
# import select
import os

N = 15

class InteractiveGame:
    def __init__(self, bot_program, player_piece='O'):
        self.board = [[' ' for _ in range(N)] for _ in range(N)]
        self.player_piece = player_piece
        self.bot_piece = 'X' if player_piece == 'O' else 'O'

        current_dir = os.path.dirname(os.path.abspath(__file__))
        bot_path = os.path.join(current_dir, bot_program)
        print(f"Full bot path: {bot_path}", file=sys.stderr)
        print(f"Player plays as: {player_piece}", file=sys.stderr)

        if not os.path.exists(bot_path):
            raise FileNotFoundError(f"Bot program not found at: {bot_path}")

        self.bot_process = subprocess.Popen(
            [bot_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            text=True,
            bufsize=1
        )

        # Wait for ready message
        assert self.bot_process.stdout != None
        ready = self.bot_process.stdout.readline().strip()
        print(f"Bot says: {ready}", file=sys.stderr)

        if self.bot_piece == 'O':
            print(f"Bot plays first as O", file=sys.stderr)  # Debug log
            assert self.bot_process.stdin != None
            self.bot_process.stdin.write("start\n")
            self.bot_process.stdin.flush()

            # Get bot's first move
            bot_move = self.bot_process.stdout.readline().strip()
            print(f"Bot's first move: {bot_move}", file=sys.stderr)  # Debug log
            try:
                bot_x, bot_y = map(int, bot_move.split())
                if 0 <= bot_x < N and 0 <= bot_y < N:
                    self.board[bot_x][bot_y] = 'O'
                    print(json.dumps({'x': bot_x, 'y': bot_y, 'initial': True}))
                    sys.stdout.flush()
                else:
                    print(json.dumps({'error': 'Invalid bot first move coordinates'}))
                    sys.stdout.flush()
            except Exception as e:
                print(f"Error processing bot's first move: {str(e)}", file=sys.stderr)
                print(json.dumps({'error': 'Invalid bot first move'}))
                sys.stdout.flush()

    def check_win(self, x, y, symbol):
        directions = [
            [(0, 1)],  # horizontal
            [(1, 0)],  # vertical
            [(1, 1)],  # diagonal \
            [(1, -1)]  # diagonal /
        ]

        for dir in directions:
            dx, dy = dir[0]
            winning_cells = [(x, y)]  # Include the current move
            count = 1

            # Check in positive direction
            i, j = x + dx, y + dy
            while 0 <= i < N and 0 <= j < N and self.board[i][j] == symbol:
                winning_cells.append((i, j))
                count += 1
                i += dx
                j += dy

            # Check in negative direction
            i, j = x - dx, y - dy
            while 0 <= i < N and 0 <= j < N and self.board[i][j] == symbol:
                winning_cells.append((i, j))
                count += 1
                i -= dx
                j -= dy

            if count >= 5:
                return winning_cells
        return None

    def make_move(self, x, y):
        try:
            # Validate the move
            if not (0 <= x < N and 0 <= y < N) or self.board[x][y] != ' ':
                return {'error': 'Invalid move'}

            # Update board with player's move
            self.board[x][y] = self.player_piece

            # Check if player won
            winning_cells = self.check_win(x, y, self.player_piece)
            if winning_cells:
                return {
                    'x': -1,
                    'y': -1,
                    'winner': self.player_piece,
                    'winning_cells': winning_cells
                }

            # Send move to bot
            assert self.bot_process.stdin != None
            self.bot_process.stdin.write(f"{x} {y}\n")
            self.bot_process.stdin.flush()

            # Get bot's response
            MAX_ATTEMPTS = 3
            for attempt in range(MAX_ATTEMPTS):
                try:
                    assert self.bot_process.stdout != None
                    bot_move = self.bot_process.stdout.readline().strip()
                    if not bot_move:
                        continue

                    bot_x, bot_y = map(int, bot_move.split())
                    if 0 <= bot_x < N and 0 <= bot_y < N and self.board[bot_x][bot_y] == ' ':
                        self.board[bot_x][bot_y] = self.bot_piece

                        winning_cells = self.check_win(bot_x, bot_y, self.bot_piece)
                        if winning_cells:
                            return {
                                'x': bot_x,
                                'y': bot_y,
                                'winner': self.bot_piece,
                                'winning_cells': winning_cells
                            }
                        return {'x': bot_x, 'y': bot_y, 'winner': None}
                except:
                    if attempt == MAX_ATTEMPTS - 1:
                        return {'error': 'Bot failed to respond'}
                    continue

            return {'error': 'Bot failed to make a valid move'}

        except Exception as e:
            print(f"Error in make_move: {str(e)}", file=sys.stderr)
            return {'error': 'Internal game error'}

    def cleanup(self):
        assert self.bot_process.stdin != None
        self.bot_process.stdin.write("end\n")
        self.bot_process.stdin.flush()
        self.bot_process.terminate()
        self.bot_process.wait()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Bot program and player piece required"}))
        sys.exit(1)

    bot_program = sys.argv[1]
    player_piece = sys.argv[2]  # 'O' or 'X'
    game = InteractiveGame(bot_program, player_piece)

    try:
        while True:
            # Read move from stdin (from Node.js server)
            line = sys.stdin.readline().strip()
            if line == "exit":
                break

            try:
                move = json.loads(line)
                x, y = move['x'], move['y']

                bot_move = game.make_move(x, y)
                if bot_move:
                    print(json.dumps(bot_move))
                    sys.stdout.flush()
                else:
                    print(json.dumps({"error": "Invalid bot move"}))
                    sys.stdout.flush()

            except json.JSONDecodeError:
                print(json.dumps({"error": "Invalid input format"}))
                sys.stdout.flush()

    finally:
        game.cleanup()
