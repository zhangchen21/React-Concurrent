import {
	requestHostCallback,
	requestHostTimeout,
	cancelHostTimeout,
	shouldYieldToHost,
	getCurrentTime,
	forceFrameRate,
	requestPaint,
} from './SchedulerHostConfig';
import {push, pop, peek} from './SchedulerMinHeap';

let taskQueue = [];
// 任务序号的自增标记
let taskIdCounter = 1;
// 标记是否处于调度阶段
let isHostCallbackScheduled = false;
// 这是在执行工作时设置的，以防止重新进入
let isPerformingWork = false;
let currentTask = null;

function scheduleCallback(priorityLevel, callback, options) {
	let currentTime = getCurrentTime();
	// 任务开始时间
	let startTime = currentTime;
	// 任务的可持续时间，由优先级决定
	let timeout;
	// 任务过期时间
	let expirationTime = startTime + timeout;
	//新建任务
	let newTask = {
		id: taskIdCounter++,
		callback,
		priorityLevel,
		startTime,
		expirationTime,
		sortIndex: -1,
	};

	// 过期时间越近，优先级越高
	newTask.sortIndex = expirationTime;
	// 加入任务队列
	push(taskQueue, newTask);
	//请求进行调度
	if(!isHostCallbackScheduled && !isPerformingWork) {
		isHostCallbackScheduled = true;
		requestHostCallback(flushWork);
	}
	return newTask;
}

function flushWork(hasTimeRemaining, initialTime) {
	isHostCallbackScheduled = false;
	isPerformingWork = true;
	const previousPriorityLevel = currentPriorityLevel;
	try {
		return workLoop(hasTimeRemaining, initialTime);
	} finally {
		currentTask = null;
		isPerformingWork = false;
	}
}

function workLoop(hasTimeRemaining, initialTime) {
	let currentTime = initialTime;
	currentTask = peek(taskQueue);
	while(currentTask) {
		if(
		// 任务还没有结束
			currentTask.expirationTime > currentTime &&
      // 但是没有时间了 or 应该退还主线程了
      (!hasTimeRemaining || shouldYieldToHost())
		) {
			break;
		}

		const callback = currentTask.callback;
		if(typeof callback !== 'function') {
			pop(taskQueue);
		} else {
			currentTask.callback = null;
			currentPriorityLevel = currentTask.priorityLevel;
			const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
			const continuationCallback = callback(didUserCallbackTimeout);
			currentTime = getCurrentTime();
			if(typeof continuationCallback !== 'function') {
				if (currentTask === peek(taskQueue)) {
					pop(taskQueue);
				}
			} else {
				currentTask.callback = continuationCallback;
			}
		}
		// 更新currentTask
		currentTask = peek(taskQueue);
	}

	if (currentTask !== null) {
		return true; // 如果task队列没有清空, 返回true. 等待调度中心下一次回调
	} else {
		return false; // task队列已经清空, 返回false.
	}  
}

export {
	ImmediatePriority as unstable_ImmediatePriority,
	UserBlockingPriority as unstable_UserBlockingPriority,
	NormalPriority as unstable_NormalPriority,
	IdlePriority as unstable_IdlePriority,
	LowPriority as unstable_LowPriority,
	unstable_runWithPriority,
	unstable_next,
	unstable_scheduleCallback,
	unstable_cancelCallback,
	unstable_wrapCallback,
	unstable_getCurrentPriorityLevel,
	shouldYieldToHost as unstable_shouldYield,
	unstable_requestPaint,
	unstable_continueExecution,
	unstable_pauseExecution,
	unstable_getFirstCallbackNode,
	getCurrentTime as unstable_now,
	forceFrameRate as unstable_forceFrameRate,
};