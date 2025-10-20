// SpeechManager.js - 语音识别管理器，负责处理语音命令识别和语音转文本功能
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
function _ts_generator(thisArg, body) {
    var f, y, t, g, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    };
    return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(_)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}
export var SpeechManager = /*#__PURE__*/ function() {
    "use strict";
    function SpeechManager(onTranscript, onRecognitionActive, onCommandRecognized) {
        var _this = this;
        _class_call_check(this, SpeechManager);
        this.onTranscript = onTranscript;
        this.onRecognitionActive = onRecognitionActive; // 识别状态的回调函数
        this.onCommandRecognized = onCommandRecognized; // 命令识别的回调函数
        this.recognition = null;
        this.isRecognizing = false;
        this.finalTranscript = '';
        this.interimTranscript = '';
        var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true; // 即使在暂停后也继续监听
            this.recognition.interimResults = true; // 在说话过程中获取结果
            this.recognition.lang = 'zh-CN'; // 设置语言为中文（普通话，中国大陆）
            this.recognition.onstart = function() {
                _this.isRecognizing = true;
                console.log('语音识别已启动。');
                if (_this.onRecognitionActive) _this.onRecognitionActive(true);
            };
            this.recognition.onresult = function(event) {
                _this.interimTranscript = '';
                for(var i = event.resultIndex; i < event.results.length; ++i){
                    if (event.results[i].isFinal) {
                        // 附加到finalTranscript，然后为下一个话语清除它
                        // 这样，`finalTranscript`保存*当前完整的*话语。
                        var currentFinalTranscript = event.results[i][0].transcript.trim().toLowerCase();
                        _this.finalTranscript += currentFinalTranscript; // 如果需要，附加到可能更长的会话记录中，尽管我们按话语处理
                        if (_this.onTranscript) {
                            // 在处理为命令之前显示原始记录
                            _this.onTranscript(event.results[i][0].transcript, ''); // 发送最终结果，清除临时结果
                        }
                        // 检查命令
                        var commandMap = {
                            // 英文命令
                            'drag': 'drag',
                            'rotate': 'rotate',
                            'rotation': 'rotate',
                            'scale': 'scale',
                            'size': 'scale',
                            'zoom': 'scale',
                            'fixed': 'fixed',
                            'lock': 'fixed',
                            
                            // 中文命令
                            '拖拽': 'drag',
                            '拖动': 'drag',
                            '旋转': 'rotate',
                            '转动': 'rotate',
                            '缩放': 'scale',
                            '大小': 'scale',
                            '放大': 'scale',
                            '缩小': 'scale',
                            '固定': 'fixed',
                            '锁定': 'fixed'
                        };
                        var spokenCommands = Object.keys(commandMap);
                        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
                        try {
                            for(var _iterator = spokenCommands[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                                var spokenCmd = _step.value;
                                if (currentFinalTranscript.includes(spokenCmd)) {
                                    var actualCommand = commandMap[spokenCmd];
                                    if (_this.onCommandRecognized) {
                                        _this.onCommandRecognized(actualCommand);
                                    }
                                    break; // Process the first command found (and its alias)
                                }
                            }
                        } catch (err) {
                            _didIteratorError = true;
                            _iteratorError = err;
                        } finally{
                            try {
                                if (!_iteratorNormalCompletion && _iterator.return != null) {
                                    _iterator.return();
                                }
                            } finally{
                                if (_didIteratorError) {
                                    throw _iteratorError;
                                }
                            }
                        }
                        // 如果您是按话语处理，则为下一个完整话语重置finalTranscript
                        // 如果您想累积，那么不要在这里重置。
                        // 对于命令处理，通常最好按话语重置。
                        _this.finalTranscript = '';
                    } else {
                        _this.interimTranscript += event.results[i][0].transcript;
                        if (_this.onTranscript) {
                            _this.onTranscript(null, _this.interimTranscript);
                        }
                    }
                }
                // 如果在此事件批处理中只处理了临时结果，确保调用onTranscript
                if (_this.interimTranscript && !event.results[event.results.length - 1].isFinal) {
                    if (_this.onTranscript) {
                        _this.onTranscript(null, _this.interimTranscript);
                    }
                }
            };
            this.recognition.onerror = function(event) {
                console.error('语音识别错误:', event.error);
                var oldIsRecognizing = _this.isRecognizing;
                _this.isRecognizing = false;
                _this.finalTranscript = ''; // 出错时清除记录
                _this.interimTranscript = '';
                if (_this.onTranscript) _this.onTranscript('', ''); // 清除显示
                if (oldIsRecognizing && _this.onRecognitionActive) _this.onRecognitionActive(false);
                // 如果是"中止"或"无语音"错误，自动重启
                if (event.error === 'aborted' || event.error === 'no-speech') {
                    console.log('由于不活动或中止而重新启动语音识别。');
                // 不直接调用startRecognition，如果是连续模式，让onend处理它
                }
            };
            this.recognition.onend = function() {
                var oldIsRecognizing = _this.isRecognizing;
                _this.isRecognizing = false;
                console.log('语音识别已结束。');
                _this.finalTranscript = ''; // 结束时清除记录
                _this.interimTranscript = '';
                if (_this.onTranscript) _this.onTranscript('', ''); // 清除显示
                if (oldIsRecognizing && _this.onRecognitionActive) _this.onRecognitionActive(false);
                // 如果它结束且continuous为true，则重新启动它。
                // 这处理浏览器可能停止它的情况。
                if (_this.recognition.continuous) {
                    console.log('连续模式：重新启动语音识别。');
                    _this.startRecognition(); // startRecognition已经重置了记录
                }
            };
        } else {
            console.warn('此浏览器不支持Web语音API。');
        }
    }
    _create_class(SpeechManager, [
        {
            key: "startRecognition",
            value: function startRecognition() {
                var _this = this;
                if (this.recognition && !this.isRecognizing) {
                    try {
                        this.finalTranscript = ''; // 重置记录
                        this.interimTranscript = '';
                        this.recognition.start();
                    } catch (e) {
                        console.error("启动语音识别时出错:", e);
                        // 这可能是因为它已经启动或由于权限问题
                        if (e.name === 'InvalidStateError' && this.isRecognizing) {
                        // 已经启动，不做任何事情
                        } else {
                            // 如果由于其他原因失败，尝试重启（例如，在错误之后）
                            setTimeout(function() {
                                return _this.startRecognition();
                            }, 500);
                        }
                    }
                }
            }
        },        {
            key: "stopRecognition",
            value: function stopRecognition() {
                if (this.recognition && this.isRecognizing) {
                    this.recognition.stop();
                }
            }
        },
        {
            key: "updateSpeechRecognitionState",
            value: function updateSpeechRecognitionState() {
                // 检查语音识别设置
                const speechEnabled = localStorage.getItem('speechRecognitionEnabled') !== 'false';
                
                if (speechEnabled && !this.isRecognizing) {
                    // 如果设置为启用且当前未运行，则启动语音识别
                    this.requestPermissionAndStart();
                } else if (!speechEnabled && this.isRecognizing) {
                    // 如果设置为禁用且当前正在运行，则停止语音识别
                    this.stopRecognition();
                }
                
                return speechEnabled;
            }
        },
        {
            key: "requestPermissionAndStart",
            value: // 在用户交互时调用此函数以请求麦克风权限
            function requestPermissionAndStart() {
                var _this = this;
                return _async_to_generator(function() {
                    var err;
                    return _ts_generator(this, function(_state) {
                        switch(_state.label){
                            case 0:
                                if (!_this.recognition) {
                                    console.log("语音识别不受支持。");
                                    return [
                                        2
                                    ];
                                }
                                _state.label = 1;
                            case 1:
                                _state.trys.push([
                                    1,
                                    3,
                                    ,
                                    4
                                ]);
                                // Attempt to get microphone access (this might prompt the user)
                                return [
                                    4,
                                    navigator.mediaDevices.getUserMedia({
                                        audio: true
                                    })
                                ];
                            case 2:
                                _state.sent();
                                console.log("Microphone permission granted.");
                                _this.startRecognition();
                                return [
                                    3,
                                    4
                                ];
                            case 3:
                                err = _state.sent();
                                console.error("Microphone permission denied or error:", err);
                                if (_this.onTranscript) {
                                    _this.onTranscript("麦克风访问被拒绝。请在浏览器设置中允许麦克风访问。", "");
                                }
                                return [
                                    3,
                                    4
                                ];
                            case 4:
                                return [
                                    2
                                ];
                        }
                    });
                })();
            }
        }
    ]);
    return SpeechManager;
}();