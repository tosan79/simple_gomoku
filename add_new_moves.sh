#!/bin/bash
cd playing_programs
g++ random.cpp -o agent1 -std=c++17
g++ random.cpp -o agent2 -std=c++17
python3 judge.py
# cp moves.json ../noughts-and-crosses-for-5/public/moves.json
cat moves.json
