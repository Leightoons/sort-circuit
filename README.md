# Sort Circuit
Jared Leighton
CSE 248 Final Project

## Overview
 
Sort Circuit will be a multiplayer web app where players bet on races between sorting algorithms. The algorithms will be represented as robots that comparatively sort literal blocks of data and rearrange them in a line in front of them.

Each instance of the game is set up in the web app with a room code, and players will join through their phone or computer through the room code, where they can place their bets. Players do not bet points or money, but simply choose who they think the winner will be and are awarded a point if they are correct.

The room host can toggle which algorithms will take part in each race, and change global parameters such as step speed and data set parameters (size, duplicates allowed, value range), as well as parameters specific to each robot such as a step speed handicap, which is by default always equal between all robots.

The sorting algorithms robots are run completely on the server side, but are snapshots are broadcast to the clients. Algorithm sorting steps are NOT pre-calculated, but run in real-time in parallel until they have sorted their data set. Robots perform one operation per step, either a comparison or a swap.

