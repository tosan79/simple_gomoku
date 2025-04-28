#!/bin/bash
cd playing_programs
g++ smart_agent.cpp -o agent1 -std=c++17
g++ smart_agent.cpp -o agent2 -std=c++17
python3 simple_judge.py
cp moves.json ../noughts-and-crosses-for-5/public/moves.json
