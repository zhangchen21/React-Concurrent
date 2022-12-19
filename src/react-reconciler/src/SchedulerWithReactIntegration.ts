/**
 * 此文件用于协调 scheduler 和 reconciler 中的优先级
 * 
 */ 
import * as Scheduler from '../../scheduler/src/scheduler';
import type { ReactPriorityLevel } from './ReactInternalTypes';
const {
	unstable_runWithPriority: Scheduler_runWithPriority,
	unstable_scheduleCallback: Scheduler_scheduleCallback,
	unstable_cancelCallback: Scheduler_cancelCallback,
	unstable_shouldYield: Scheduler_shouldYield,
	unstable_requestPaint: Scheduler_requestPaint,
	unstable_now: Scheduler_now,
	unstable_getCurrentPriorityLevel: Scheduler_getCurrentPriorityLevel,
	unstable_ImmediatePriority: Scheduler_ImmediatePriority,
	unstable_UserBlockingPriority: Scheduler_UserBlockingPriority,
	unstable_NormalPriority: Scheduler_NormalPriority,
	unstable_LowPriority: Scheduler_LowPriority,
	unstable_IdlePriority: Scheduler_IdlePriority,
} = Scheduler;

// Except for NoPriority, these correspond to Scheduler priorities. We use
// ascending numbers so we can compare them like numbers. They start at 90 to
// avoid clashing with Scheduler's priorities.
export const ImmediatePriority = 99;
export const UserBlockingPriority = 98;
export const NormalPriority = 97;
export const LowPriority = 96;
export const IdlePriority = 95;
// NoPriority is the absence of priority. Also React-only.
export const NoPriority = 90;

const initialTimeMs: number = Scheduler_now();

// 判定两次更新任务的时间是否小于10ms，来决定是否复用上一次的更新时间Scheduler_now
// 需要兼容不支持 performance.now() 的浏览器
export const now =
	initialTimeMs < 10000 ? Scheduler_now : () => Scheduler_now() - initialTimeMs;

export function getCurrentPriorityLevel(): ReactPriorityLevel | void {
	switch (Scheduler_getCurrentPriorityLevel()) {
	case Scheduler_ImmediatePriority:
		return ImmediatePriority;
	case Scheduler_UserBlockingPriority:
		return UserBlockingPriority;
	case Scheduler_NormalPriority:
		return NormalPriority;
	case Scheduler_LowPriority:
		return LowPriority;
	case Scheduler_IdlePriority:
		return IdlePriority;
	default:
		return;
	}
}