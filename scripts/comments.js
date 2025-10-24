class CommentManager {
    constructor() {
        this.storageKey = 'heritageViewerComments';
        this.comments = this.loadComments();
        this.currentModelPath = this.getInitialModelPath();
        this.init();
    }

    init() {
        this.renderComments();
        this.setupEventListeners();
    }

    setupEventListeners() {
        const submitBtn = document.getElementById('submitComment');
        const commentInput = document.getElementById('commentInput');

        if (submitBtn && commentInput) {
            submitBtn.addEventListener('click', () => {
                this.submitComment();
            });

            commentInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 'Enter') {
                    this.submitComment();
                }
            });
        }

        window.addEventListener('modelChanged', (e) => {
            console.log('评论系统：检测到模型切换', e.detail);
            if (e.detail && e.detail.modelPath) {
                this.currentModelPath = e.detail.modelPath.replace('assets/', '');
                console.log('评论系统：更新当前模型路径为', this.currentModelPath);
                this.renderComments();
            }
        });
    }

    getInitialModelPath() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('model') || 'teacup.gltf';
    }

    loadComments() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('加载评论失败:', error);
            return [];
        }
    }

    saveComments() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.comments));
            return true;
        } catch (error) {
            console.error('保存评论失败:', error);
            alert('保存评论失败，可能是存储空间已满');
            return false;
        }
    }

    submitComment() {
        const commentInput = document.getElementById('commentInput');
        const content = commentInput.value.trim();

        if (!content) {
            alert('请输入评论内容');
            return;
        }

        if (content.length > 500) {
            alert('评论内容不能超过500字');
            return;
        }

        const newComment = {
            id: Date.now(),
            author: this.generateUsername(),
            content: content,
            timestamp: new Date().toISOString(),
            modelPath: this.getCurrentModelPath()
        };

        this.comments.unshift(newComment);

        if (this.saveComments()) {
            commentInput.value = '';
            this.renderComments();
            
            this.showNotification('评论发布成功！');
        }
    }

    generateUsername() {
        const adjectives = ['热心', '好学', '专业', '资深', '新手', '认真', '细心', '友善'];
        const nouns = ['观众', '访客', '用户', '爱好者', '学习者', '探索者', '参观者'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNum = Math.floor(Math.random() * 9999);
        return `${randomAdj}的${randomNoun}${randomNum}`;
    }

    getCurrentModelPath() {
        return this.currentModelPath;
    }

    setCurrentModelPath(modelPath) {
        console.log('评论系统：外部设置模型路径为', modelPath);
        this.currentModelPath = modelPath.replace('assets/', '');
        this.renderComments();
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) {
            return '刚刚';
        }
        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分钟前`;
        }
        if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}小时前`;
        }
        if (diff < 604800000) {
            return `${Math.floor(diff / 86400000)}天前`;
        }
        
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    renderComments() {
        const commentsList = document.getElementById('commentsList');
        if (!commentsList) return;

        const currentModelPath = this.getCurrentModelPath();
        console.log('评论系统：渲染评论，当前模型路径=', currentModelPath);
        const currentModelComments = this.comments.filter(c => c.modelPath === currentModelPath);
        console.log('评论系统：找到', currentModelComments.length, '条评论');

        if (currentModelComments.length === 0) {
            commentsList.innerHTML = '<div class="no-comments">暂无评论，快来发布第一条评论吧！</div>';
            return;
        }

        const commentsHTML = currentModelComments.map(comment => `
            <div class="comment-item" data-comment-id="${comment.id}">
                <div class="comment-header">
                    <span class="comment-author">${this.escapeHtml(comment.author)}</span>
                    <span class="comment-time">${this.formatTime(comment.timestamp)}</span>
                </div>
                <div class="comment-content">${this.escapeHtml(comment.content)}</div>
            </div>
        `).join('');

        commentsList.innerHTML = commentsHTML;

        commentsList.scrollTop = 0;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 30px;
            background: #4CAF50;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideInRight 0.3s ease-out;
            font-size: 14px;
        `;
        notification.textContent = message;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    exportComments() {
        const dataStr = JSON.stringify(this.comments, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `comments_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    clearAllComments() {
        if (confirm('确定要清空所有评论吗？此操作不可恢复！')) {
            this.comments = [];
            this.saveComments();
            this.renderComments();
            this.showNotification('所有评论已清空');
        }
    }

    addTestComments() {
        const testComments = [
            { content: '这件文物太精美了！可以看出古代工匠的精湛技艺。', author: '文物爱好者1024' },
            { content: '通过3D展示真的能看到很多细节，比实地参观还清晰！', author: '博物馆迷888' },
            { content: '希望能有更多这样的数字化文物展示，保护文化遗产。', author: '历史研究者520' },
            { content: '这个3D模型做得很逼真，各个角度都能观察。', author: '科技达人007' },
            { content: '感谢提供这么好的平台，让我们足不出户就能欣赏珍贵文物。', author: '传统文化守护者' }
        ];

        const currentModelPath = this.getCurrentModelPath();
        testComments.forEach((comment, index) => {
            this.comments.push({
                id: Date.now() + index,
                author: comment.author,
                content: comment.content,
                timestamp: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
                modelPath: currentModelPath
            });
        });

        this.saveComments();
        this.renderComments();
        this.showNotification('已添加测试评论');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.commentManager = new CommentManager();
    
    console.log('评论系统已初始化');
    console.log('可用命令:');
    console.log('  commentManager.addTestComments() - 添加测试评论');
    console.log('  commentManager.exportComments() - 导出评论数据');
    console.log('  commentManager.clearAllComments() - 清空所有评论');
});

export default CommentManager;

