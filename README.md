# 3D Model Playground

Control 3D models using hand gestures and voice commands in real-time.

An interactive web app built with Three.js, MediaPipe computer vision, Web Speech API, and Rosebud AI.

- Say "drag", "rotate", "scale", or "animate" to change the interaction mode
- Pinch fingers to control the 3D model
- Drag/drop a new 3D model onto the page to import it (GLTF format only for now)

[Video](https://x.com/measure_plan/status/1929900748235550912) | [Live Demo](https://collidingscopes.github.io/3d-model-playground/)

## Requirements

- Modern web browser with WebGL support
- Camera / microphone access

## Technologies

- **Three.js** for 3D rendering
- **MediaPipe** for hand tracking and gesture recognition
- **Web Speech API** for speech recognition
- **HTML5 Canvas** for visual feedback
- **JavaScript** for real-time interaction

## Setup for Development

```bash
# Serve with your preferred method (example using Python)
python -m http.server
```

Then navigate to `http://localhost:8000` in your browser.

## License

MIT License

## Credits

- Three.js - https://threejs.org/
- MediaPipe - https://mediapipe.dev/
- Rosebud AI - https://rosebud.ai/
- Quaternius 3D models - https://quaternius.com/