import subprocess
import json
import sys
import os
import time
import stat

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

        # Check if the file is executable and try to make it executable if needed
        if not os.access(bot_path, os.X_OK):
            print(f"Bot program is not executable: {bot_path}", file=sys.stderr)
            try:
                # Make the file executable
                current_mode = os.stat(bot_path).st_mode
                os.chmod(bot_path, current_mode | stat.S_IEXEC)
                print(f"Made bot program executable", file=sys.stderr)
            except Exception as e:
                print(f"Could not make bot executable: {e}", file=sys.stderr)
                raise

        # Small delay to ensure file system operations are complete
        time.sleep(0.1)

        try:
            self.bot_process = subprocess.Popen(
                [bot_path],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,  # Capture stderr to see bot errors
                text=True,
                bufsize=1
            )
        except Exception as e:
            print(f"Failed to start bot process: {e}", file=sys.stderr)
            raise

        # Wait for ready message with timeout
        try:
            # Set a timeout for the ready message
            import select
            ready_list, _, _ = select.select([self.bot_process.stdout], [], [], 5.0)  # 5 second timeout

            if ready_list:
                assert self.bot_process.stdout != None
                ready = self.bot_process.stdout.readline().strip()
                print(f"Bot says: {ready}", file=sys.stderr)

                if not ready or ready != "ready":
                    # Check if process crashed
                    if self.bot_process.poll() is not None:
                        assert self.bot_process.stderr != None
                        stderr_output = self.bot_process.stderr.read()
                        raise RuntimeError(f"Bot process crashed during startup. Stderr: {stderr_output}")
                    else:
                        raise RuntimeError(f"Bot didn't send ready message, got: '{ready}'")
            else:
                # Timeout occurred
                assert self.bot_process.stderr != None
                stderr_output = self.bot_process.stderr.read()
                raise TimeoutError(f"Bot didn't respond within 5 seconds. Stderr: {stderr_output}")

        except ImportError:
            # Fallback for systems without select (like Windows)
            try:
                assert self.bot_process.stdout != None
                ready = self.bot_process.stdout.readline().strip()
                print(f"Bot says: {ready}", file=sys.stderr)
            except Exception as e:
                assert self.bot_process.stderr != None
                stderr_output = self.bot_process.stderr.read()
                raise RuntimeError(f"Failed to get ready message: {e}. Stderr: {stderr_output}")

        # Handle first move if bot plays as O
        if self.bot_piece == 'O':
            print(f"Bot plays first as O", file=sys.stderr)
            try:
                assert self.bot_process.stdin != None
                self.bot_process.stdin.write("start\n")
                self.bot_process.stdin.flush()

                # Get bot's first move with timeout
                bot_move = self.bot_process.stdout.readline().strip()
                print(f"Bot's first move: {bot_move}", file=sys.stderr)

                if not bot_move:
                    raise RuntimeError("Bot didn't provide first move")

                bot_x, bot_y = map(int, bot_move.split())
                if 0 <= bot_x < N and 0 <= bot_y < N:
                    self.board[bot_x][bot_y] = 'O'
                    print(json.dumps({'x': bot_x, 'y': bot_y, 'initial': True}))
                    sys.stdout.flush()
                else:
                    print(json.dumps({'error': 'Invalid bot first move coordinates'}))
                    sys.stdout.flush()

            except ValueError as e:
                print(f"Error parsing bot's first move: {str(e)}", file=sys.stderr)
                print(json.dumps({'error': 'Invalid bot first move format'}))
                sys.stdout.flush()
            except Exception as e:
                print(f"Error processing bot's first move: {str(e)}", file=sys.stderr)
                assert self.bot_process.stderr != None
                stderr_output = self.bot_process.stderr.read()
                print(f"Bot stderr: {stderr_output}", file=sys.stderr)
                print(json.dumps({'error': 'Bot failed to make first move'}))
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
            try:
                assert self.bot_process.stdin != None
                self.bot_process.stdin.write(f"{x} {y}\n")
                self.bot_process.stdin.flush()
            except BrokenPipeError:
                return {'error': 'Bot process crashed'}

            # Get bot's response with retries and timeout
            MAX_ATTEMPTS = 3
            for attempt in range(MAX_ATTEMPTS):
                try:
                    # Check if bot process is still alive
                    if self.bot_process.poll() is not None:
                        assert self.bot_process.stderr != None
                        stderr_output = self.bot_process.stderr.read()
                        return {'error': f'Bot process died. Stderr: {stderr_output}'}

                    assert self.bot_process.stdout != None
                    bot_move = self.bot_process.stdout.readline().strip()
                    if not bot_move:
                        if attempt == MAX_ATTEMPTS - 1:
                            return {'error': 'Bot failed to respond'}
                        time.sleep(0.1)  # Brief delay before retry
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
                    else:
                        if attempt == MAX_ATTEMPTS - 1:
                            return {'error': f'Bot made invalid move: {bot_x}, {bot_y}'}
                        time.sleep(0.1)
                        continue

                except ValueError:
                    if attempt == MAX_ATTEMPTS - 1:
                        assert self.bot_process.stderr != None
                        stderr_output = self.bot_process.stderr.read()
                        return {'error': f'Bot sent invalid move format: "{bot_move}". Stderr: {stderr_output}'}
                    time.sleep(0.1)
                    continue
                except Exception as e:
                    if attempt == MAX_ATTEMPTS - 1:
                        assert self.bot_process.stderr != None
                        stderr_output = self.bot_process.stderr.read()
                        return {'error': f'Error reading bot move: {str(e)}. Stderr: {stderr_output}'}
                    time.sleep(0.1)
                    continue

            return {'error': 'Bot failed to make a valid move after multiple attempts'}

        except Exception as e:
            print(f"Error in make_move: {str(e)}", file=sys.stderr)
            return {'error': 'Internal game error'}

    def cleanup(self):
        try:
            if self.bot_process.poll() is None:  # Process is still running
                assert self.bot_process.stdin != None
                self.bot_process.stdin.write("end\n")
                self.bot_process.stdin.flush()

                # Give bot a moment to clean up
                time.sleep(0.1)

            self.bot_process.terminate()

            # Wait a bit for graceful termination
            try:
                self.bot_process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                # Force kill if it doesn't terminate gracefully
                self.bot_process.kill()
                self.bot_process.wait()

        except Exception as e:
            print(f"Error during cleanup: {e}", file=sys.stderr)
            try:
                self.bot_process.kill()
            except:
                pass

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Bot program and player piece required"}))
        sys.exit(1)

    bot_program = sys.argv[1]
    player_piece = sys.argv[2]  # 'O' or 'X'

    try:
        game = InteractiveGame(bot_program, player_piece)
    except Exception as e:
        print(json.dumps({"error": f"Failed to initialize game: {str(e)}"}))
        sys.exit(1)

    try:
        while True:
            # Read move from stdin (from Node.js server)
            line = sys.stdin.readline().strip()
            if line == "exit" or not line:
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
            except Exception as e:
                print(json.dumps({"error": f"Error processing move: {str(e)}"}))
                sys.stdout.flush()

    except KeyboardInterrupt:
        print("Game interrupted", file=sys.stderr)
    finally:
        game.cleanup()
