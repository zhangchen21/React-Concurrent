
export let requestHostCallback;
export let cancelHostCallback;
export let requestHostTimeout;
export let cancelHostTimeout;
export let shouldYieldToHost;
export let requestPaint;
export let getCurrentTime;
export let forceFrameRate;

function performWorkUntilDeadline() {
	if(scheduledHostCallback) {
		const currentTime = getCurrentTime();
		// 计算deadline
		deadline = currentTime + yieldInterval;
		const hasTimeRemaining = true;
		// 执行调度
		try {
			const hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
			if(!hasMoreWork) {
				// 结束调度
				isMessageLoopRunning = false;
				scheduledHostCallback = null;
			} else {
				// 新的调度
				port.postMessage(null);
			}
		} catch (error) {
			// 异常，重新调度
			port.postMessage(null);
			throw error;
		}
	} else {
		isMessageLoopRunning = false;
	}

	needsPaint = false;
}

getCurrentTime = () => performance.now();

let scheduledHostCallback = null;
let isMessageLoopRunning = false;

// MessageChannel在浏览器事件循环中属于宏任务
// 这将使得回调函数异步执行
const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;

requestHostCallback = (callback) => {
	// 1. 保存callback
	scheduledHostCallback = callback;
	if(!isMessageLoopRunning) {
		isMessageLoopRunning = true;
		// 2. 触发port1的onmessage回调，进入perform流程
		port.postMessage(null);
	}
};

cancelHostCallback = () => {
	scheduledHostCallback = null;
};

let yieldInterval = 5;// ms
let deadline = 0;
let needsPaint = false;
const scheduling = navigator.scheduling;

shouleYieldToHost = () => {
	const currentTime = getCurrentTime();

	if(currentTime >= deadline) {
		if(needsPaint || scheduling.isInputPending()) {
			return true;
		}
		return false;
	} else {
		return false;
	}
};

requestPaint = () => {
	needsPaint = true;
};