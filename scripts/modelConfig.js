// modelConfig.js - 统一管理模型的缩放和位置配置

/**
 * 模型配置映射表
 * 键：模型文件名或路径关键词
 * 值：配置对象
 *   - scale: 初始缩放比例
 *   - maxScale: 最大缩 - minScale: 最小缩放比例（可选，默认为 scale * 0.1）
 *   - posY: Y轴位置（可选）
 *   - posYFactor: Y轴位置因子（相对于容器高度，可选）
 *   - posZ: Z轴位置（可选）
 *   - centerOffset: 是否需要中心偏移补偿（可选，默认false）
 */
export const MODEL_CONFIGS = {
    'default': {
        scale: 80,
        maxScale: 300,
        minScale: 8,
        posYFactor: -0.45,
        posZ: -1000
    },
    
    'teacup.gltf': {
        scale: 2000,
        maxScale: 5000,
        minScale: 200,
        posYFactor: -0.45,
        posZ: -1000
    },
    
    'copper-chew.gltf': {
        scale: 5000,
        maxScale: 9000,
        minScale: 500,
        posYFactor: -0.45,
        posZ: -1000
    },
    
    'modelNew.gltf': {
        scale: 20,
        maxScale: 300,
        minScale: 2,
        posYFactor: -0.45,
        posZ: -1000
    },
    
    'armillary_sphere_1771': {
        scale: 1000,
        maxScale: 2000,
        minScale: 100,
        posY: -100,
        posZ: -500
    },
    
    'ding_censer_with_an_openwork_cover': {
        scale: 1,
        maxScale: 30,
        minScale: 0.1,
        posY: 0,
        posZ: -1500,
        centerOffset: true
    },
    
    'mass_chalice': {
        scale: 12,
        maxScale: 40,
        minScale: 1.2,
        posY: 0,
        posZ: -1500,
        centerOffset: true
    },
    
    'sculpture_bust_of_roza_loewenfeld': {
        scale: 3000,
        maxScale: 6000,
        minScale: 300,
        posY: -100,
        posZ: -500,
        centerOffset: true
    },
    
    'two_small_vases': {
        scale: 2,
        maxScale: 10,
        minScale: 1,
        posYFactor: 0,
        posZ: -1000
    },
    'cauldron': {
        scale: 15,
        maxScale: 200,
        minScale: 1,
        posYFactor: 0,
        posZ: -1000
    },
    'ritual_hare_mask': {
        scale: 15,
        maxScale:200,
        minScale: 1,
        posYFactor: 0,
        posZ: -1000
    },
    'mikiphone_pocket_phonograph': {
        scale: 3,
        maxScale:200,
        minScale: 1,
        posYFactor: 0,
        posZ: -1000,
        centerOffset: true
    },
     'candlestick_for_five_candles': {
         scale: 800,
         maxScale: 4000,
         minScale: 300,
         posY: 0,
         posZ: -800,
         centerOffset: true
     }
};

/**
 * 获取模型配置
 * @param {string} modelPath - 模型路径
 * @param {number} containerHeight - 容器高度（用于计算posYFactor）
 * @returns {object} 模型配置对象
 */
export function getModelConfig(modelPath, containerHeight = 0) {
    const fileName = modelPath.split('/').pop();
    
    if (MODEL_CONFIGS[fileName]) {
        return processConfig(MODEL_CONFIGS[fileName], containerHeight);
    }
    
    for (const key in MODEL_CONFIGS) {
        if (key !== 'default' && modelPath.includes(key)) {
            return processConfig(MODEL_CONFIGS[key], containerHeight);
        }
    }
    
    return processConfig(MODEL_CONFIGS['default'], containerHeight);
}

/**
 * 处理配置对象，计算实际位置
 * @param {object} config - 原始配置
 * @param {number} containerHeight - 容器高度
 * @returns {object} 处理后的配置
 */
function processConfig(config, containerHeight) {
    const processed = { ...config };
    
    if (!processed.minScale) {
        processed.minScale = Math.max(0.1, processed.scale * 0.1);
    }
    
    if (processed.posYFactor !== undefined && processed.posY === undefined) {
        processed.posY = containerHeight * processed.posYFactor;
    }
    
    if (processed.posY === undefined) {
        processed.posY = 0;
    }
    
    if (processed.posZ === undefined) {
        processed.posZ = -1000;
    }
    
    if (processed.centerOffset === undefined) {
        processed.centerOffset = false;
    }
    
    return processed;
}

/**
 * 添加或更新模型配置
 * @param {string} modelKey - 模型标识（文件名或路径关键词）
 * @param {object} config - 配置对象
 */
export function setModelConfig(modelKey, config) {
    MODEL_CONFIGS[modelKey] = config;
}

