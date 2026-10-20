#!/usr/bin/env bash
# Generates short test clips so the game runs before real videos exist.
set -euo pipefail
cd "$(dirname "$0")/.."
FONT=/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf
make() { # file color label freq
  ffmpeg -y -loglevel error \
    -f lavfi -i "color=c=$2:s=640x360:d=4:r=24" \
    -f lavfi -i "sine=frequency=$4:duration=4" \
    -vf "drawtext=fontfile=$FONT:text='$3':fontcolor=white:fontsize=40:x=(w-tw)/2:y=(h-th)/2-20,drawtext=fontfile=$FONT:text='%{eif\:4-t\:d}':fontcolor=white@0.7:fontsize=28:x=(w-tw)/2:y=h/2+40" \
    -af "volume=0.15" -c:v libx264 -crf 28 -pix_fmt yuv420p -g 48 \
    -c:a aac -b:a 64k -shortest -movflags +faststart "videos/$1"
}
make ep1_intro.mp4   "#3b6fd8" "Episode 1 · Intro"   330
make ep1_part2.mp4   "#2f9e6e" "Episode 1 · Part 2"  392
make ep1_ending.mp4  "#7a4fd1" "Episode 1 · Ending"  440
make ep2_intro.mp4   "#d8742f" "Episode 2 · Intro"   294
make ep2_middle.mp4  "#c23b5a" "Episode 2 · Middle"  349
make ep2_ending.mp4  "#3b8fb0" "Episode 2 · Ending"  523
make ep3_intro.mp4   "#5a7d2a" "Episode 3 · Intro"   262
make ep3_ending.mp4  "#8a3fa0" "Episode 3 · Ending"  587
