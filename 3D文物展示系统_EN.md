# <center>HCI Final Project - 3D-Heritage-Viewer</center>

<center>2354177 Lei Shiyu Chen, 2353922 Huijia Zhu, 2352755 Yihan Liu</center>

# 1. Project Overview

The "3D-Heritage-Viewer" is a web-based interactive application that allows users to control and browse 3D cultural relic models in real-time through gestures and voice commands. The system integrates cutting-edge web technologies such as Three.js for 3D rendering, MediaPipe for gesture recognition, and Web Speech API for voice recognition. It supports various interaction modes, including dragging, rotating, scaling, and fixed mode, and is equipped with detailed relic descriptions and a user-friendly UI.

## 1.1 Frontend Structure

- `index.html`: Project homepage providing entry points for "Start Experience," "Settings," and "Tutorial."
- `main.html`: Main interaction page featuring a 3D model display area, model selection, text descriptions, and buttons to return to the homepage.
- `settings.html`: System parameter settings page.
- `tutorial.html`: Tutorial page with illustrated instructions on system operations.

## 1.2 Key Functional Modules

### 3D Model Rendering and Interaction

- **Three.js Integration**
  The system uses Three.js to build 3D scenes, load, and render models. It supports mainstream 3D model formats like GLTF/GLB, efficiently rendering complex relic models with rich visual effects such as lighting, materials, and cameras. Users can smoothly browse and manipulate 3D relics on the web.

- **Model Selection and Loading (`modelSelector.js`)**
  Provides a flexible model switching mechanism, allowing users to select different relic models via the interface, including "Green Teapot," "Dancing Figurine," "Egyptian Djembe Drum," and "Bronze Artifact from Litou Culture." Each model can be individually configured with initial scaling ratios, maximum/minimum scaling ranges, and initial positions to ensure optimal display for models of varying sizes and styles.

- **Fixed Mode (`game.js`)**
  A newly added fixed mode allows users to disable gesture recognition, keeping the model static, suitable for display and explanation scenarios. In this mode, all gesture tracking and interaction functions are disabled, enhancing system stability.

- **Voice Commands (`SpeechManager.js`)**
  Integrates Web Speech API to support voice recognition in both Chinese and English. Users can quickly switch interaction modes through voice commands (e.g., "Fixed," "Drag," "Rotate," "Scale"), enhancing accessibility and immersive experience. Recognition results are displayed in real-time bubbles to improve interaction feedback.

### UI and User Experience

- **Model Selection Card**
  Designed as a popup, it displays all available models and highlights the currently selected item. Users can open/close the model selection card at any time, and the interface updates automatically after switching models.

- **Text Description Card (`descriptionManager.js`)**
  Each model is accompanied by detailed descriptions in both Chinese and English, stored in `descriptions.json` for easy maintenance and expansion. The description card supports one-click show/hide, helping users understand the relic's background and cultural value.

- **Model Loading Bubble (`modelLoadingBubble.js`)**
  During key operations such as model loading and switching, a bubble pops up in the lower right corner to provide real-time feedback on loading progress and status, enhancing the user experience during waiting.

- **Voice Function Toggle**
  Considering different user environments and privacy needs, the system offers a "Voice Function Toggle," allowing users to freely choose whether to enable voice recognition. When the voice function is turned off, all core interactions can still be completed through the fixed mode, ensuring system flexibility and user-friendliness.

# 2. Implemented Requirements

## 2.1 Target Users and Specific Needs

### Target Users:

- General users interested in cultural relics, history, and culture.
- Educators and students in the education field for classroom interaction and science popularization.
- Digital display needs in museums and exhibitions.

### Specific Needs:

- Browse and manipulate 3D relic models on the web without installing software.
- Simple and intuitive interaction methods (e.g., gestures, voice).
- Experience close contact with museum artifacts from home.
- Obtain detailed background information for each relic.
- Adapt to multiple terminals (PC/mobile).

## 2.2 Key Features

### 3D Model Browsing and Interaction

- Users can naturally manipulate 3D relic models through gestures (dragging, rotating, scaling), experiencing immersive interaction.
- Supports multi-model switching to meet diverse relic display needs.
- Includes a fixed mode that disables gesture recognition, suitable for static display scenarios.

### Voice Control

- Users can switch interaction modes using voice commands in both Chinese and English, enhancing accessibility and convenience.
- Voice recognition results are displayed in real-time bubbles, improving interaction transparency.
- Users can choose whether to enable voice functions based on their environment, balancing privacy and freedom.

### Relic Introduction and Science Popularization

- Each model is accompanied by detailed descriptions in both Chinese and English, helping users understand the relic's history and cultural value.
- The description card supports one-click show/hide for convenient information access.

### User-Friendly Interaction Details

- Real-time bubble and sound feedback for model loading and switching operations.
- Complete tutorials and instructional videos to help users get started without barriers.
- Aesthetic UI with responsive layout compatible with both PC and mobile devices, adapting to different usage scenarios.

# 3. Advantages and Limitations

### Advantages

1. **Multi-modal Interaction Experience**: Supports both gesture and voice interaction, allowing users to freely choose based on scenarios, greatly enhancing operational intuitiveness and fun.
2. **Fixed Mode Stability**: Includes a fixed mode that disables gesture recognition, suitable for static display scenarios, improving system stability.
3. **No Installation, Cross-platform Compatibility**: Developed based on web technology, users can access it via a browser, compatible with both PC and mobile devices, with a wide range of applications.
4. **High Extensibility and Modular Design**: Highly decoupled functional modules (e.g., model selection, description, sound effects, voice), facilitating subsequent function expansion and maintenance.
5. **User-friendliness**: Aesthetic interface, clear operation entry points, and visual and auditory feedback for key operations, lowering the learning threshold.

### Limitations

1. **Hardware Requirements**: Requires a camera and a relatively new browser supporting WebGL/MediaPipe; compatibility may be limited for older devices or browsers.
2. **Limited Model Formats**: Currently supports only GLTF/GLB formats; other 3D formats require manual conversion.
3. **Voice Recognition Dependency**: Voice functions may be unavailable in environments without internet or certain browsers.

# 4. Future Improvements

1. **Support for More 3D Model Formats**: Integrate more formats (e.g., OBJ, FBX) for automatic conversion and loading, improving compatibility.
2. **Optimize Gesture and Voice Recognition Algorithms**: Introduce smarter AI algorithms to improve recognition accuracy in low-light and complex backgrounds.
3. **Enrich Model and Content Library**: Add more relic models and multilingual descriptions, supporting online content library expansion.

# 5. Team Contributions

| Name         | Student ID | Main Contributions                                | Contribution |
|--------------|------------|--------------------------------------------------|--------------|
| Lei Shiyu Chen | 2354177    | Responsible for project architecture design, tutorial webpage creation, user experience optimization, and project report writing | 33.3%        |
| Huijia Zhu   | 2353922    | Responsible for project UI design, settings webpage creation, voice function improvement, and demonstration video recording | 33.3%        |
| Yihan Liu    | 2352755    | Responsible for determining project theme, collecting relic model resources, improving webpage functionality, and project report writing | 33.3%        |
