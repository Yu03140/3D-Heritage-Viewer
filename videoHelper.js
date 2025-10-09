// videoHelper.js - 视频加载辅助工具，用于处理视频加载失败时的备用方案
// 这是一个辅助脚本，用于在视频加载失败时尝试使用Blob URL加载视频
// 会在video_demo.html页面引用
function loadVideoWithFetch(videoElement, videoPath) {
    fetch(videoPath)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            videoElement.src = url;
            
            // 释放URL对象
            videoElement.addEventListener('loadeddata', () => {
                console.log('Video loaded via Blob URL');
            });
            
            videoElement.addEventListener('error', (e) => {
                console.error('Error loading video via Blob URL:', e);
                URL.revokeObjectURL(url);
            });
        })
        .catch(error => {
            console.error('Could not load the video:', error);
            document.getElementById('error-message').style.display = 'block';
            document.getElementById('error-message').textContent = '视频加载失败: ' + error.message;
        });
}
