#!/usr/bin/env bash
# Re-encode your real video clips into iPhone-friendly MP4s.
#
# Usage:
#   ./tools/encode.sh input.mov videos/ep1_intro.mp4          # 720p (default)
#   HEIGHT=1080 ./tools/encode.sh input.mov videos/ep1_intro.mp4
#
# Join clips that always play back to back into ONE file (no gap between them):
#   ./tools/encode.sh --join videos/ep1_intro.mp4 raw/a.mov raw/b.mov raw/c.mov
#
# What the settings do:
#   H.264 + AAC ............ plays everywhere (Safari, iOS app wrapper, Android)
#   yuv420p ................ required for iPhone hardware decode
#   -movflags +faststart ... moves the index to the front so playback starts
#                            before the whole file downloads
#   CRF 23 ................. good quality/size balance; raise to 26-28 for
#                            simple flat cartoon art to shrink files further
#   -g 48 .................. keyframe every 2s at 24fps (quick start/seek)

set -euo pipefail

HEIGHT="${HEIGHT:-720}"
CRF="${CRF:-23}"
COMMON=(-c:v libx264 -preset slow -crf "$CRF" -profile:v high -level 4.0
        -pix_fmt yuv420p -g 48 -c:a aac -b:a 128k -ac 2 -ar 48000
        -movflags +faststart)

if [[ "${1:-}" == "--join" ]]; then
  out="$2"; shift 2
  inputs=(); filter=""; n=0
  for f in "$@"; do
    inputs+=(-i "$f")
    filter+="[$n:v]scale=-2:${HEIGHT},setsar=1,fps=24[v$n];[$n:a]aresample=48000[a$n];"
    n=$((n+1))
  done
  for ((i=0;i<n;i++)); do filter+="[v$i][a$i]"; done
  filter+="concat=n=$n:v=1:a=1[v][a]"
  ffmpeg -y "${inputs[@]}" -filter_complex "$filter" -map "[v]" -map "[a]" "${COMMON[@]}" "$out"
else
  in="$1"; out="$2"
  ffmpeg -y -i "$in" -vf "scale=-2:${HEIGHT},fps=24" "${COMMON[@]}" "$out"
fi

echo "Wrote $out ($(du -h "$out" | cut -f1))"
