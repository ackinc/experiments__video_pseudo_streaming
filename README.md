# Serving videos

When allowing a user to view videos on our website, we want two things:

1. [Progressive download/playback] Video should not need to be fully downloaded before it can start playing
2. [Seek] User should be able to seek to a random part of the video, and start playback from there

This is achievable via HTTP pseudo-streaming

For 1:

- webm: automatic support
- mp4: ensure the 'moov' atom is at the front of the file (`ffmpeg -i in.mp4 -movflags faststart out.mp4`)

For 2:

- ensure the web server supports Range-requests (see https://zoompf.com/blog/2010/03/performance-tip-for-http-downloads/)
