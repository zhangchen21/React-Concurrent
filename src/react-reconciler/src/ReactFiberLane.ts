
// 与fiber构造过程相关的优先级(如fiber.updateQueue,fiber.lanes)都使用LanePriority
import type { ReactPriorityLevel } from './ReactInternalTypes';

export type LanePriority =
  | 0
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17;
export type Lanes = number;
export type Lane = number;
export type LaneMap<T> = Array<T>;

// 导入定义好的优先级等级，用于实现优先级的转换
import {
	ImmediatePriority as ImmediateSchedulerPriority,
	UserBlockingPriority as UserBlockingSchedulerPriority,
	NormalPriority as NormalSchedulerPriority,
	LowPriority as LowSchedulerPriority,
	IdlePriority as IdleSchedulerPriority,
} from './SchedulerWithReactIntegration';

export const SyncLanePriority: LanePriority = 15;
export const InputDiscreteLanePriority: LanePriority = 12;
export const InputContinuousLanePriority: LanePriority = 10;
export const DefaultLanePriority: LanePriority = 8;
const IdleLanePriority: LanePriority = 2;
export const NoLanePriority: LanePriority = 0;

const TotalLanes = 31;
export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;


export const NoTimestamp = -1;


export function createLaneMap<T>(initial: T): LaneMap<T> {
	// Intentionally pushing one by one.
	// https://v8.dev/blog/elements-kinds#avoid-creating-holes
	// 配合ts，这里加了一个类型
	const laneMap: LaneMap<T> = [];
	for (let i = 0; i < TotalLanes; i++) {
		laneMap.push(initial);
	}
	return laneMap;
}

// 根据传入的 scheduler 优先级等级转化成对应的lane优先级
export function schedulerPriorityToLanePriority(
	schedulerPriorityLevel: ReactPriorityLevel | void,
): LanePriority {
	switch (schedulerPriorityLevel) {
	case ImmediateSchedulerPriority:
		return SyncLanePriority;
	case UserBlockingSchedulerPriority:
		return InputContinuousLanePriority;
	case NormalSchedulerPriority:
	case LowSchedulerPriority:
		return DefaultLanePriority;
	case IdleSchedulerPriority:
		return IdleLanePriority;
	default:
		return NoLanePriority;
	}
}

// 纯函数
export function findUpdateLane(
	lanePriority: LanePriority,
	wipLanes: Lanes,
): Lane {
	switch (lanePriority) {
	case NoLanePriority:
		break;
	case SyncLanePriority:
		return SyncLane;
	case SyncBatchedLanePriority:
		return SyncBatchedLane;
	case InputDiscreteLanePriority: {
		const lane = pickArbitraryLane(InputDiscreteLanes & ~wipLanes);
		if (lane === NoLane) {
			// Shift to the next priority level
			return findUpdateLane(InputContinuousLanePriority, wipLanes);
		}
		return lane;
	}
	case InputContinuousLanePriority: {
		const lane = pickArbitraryLane(InputContinuousLanes & ~wipLanes);
		if (lane === NoLane) {
			// Shift to the next priority level
			return findUpdateLane(DefaultLanePriority, wipLanes);
		}
		return lane;
	}
	case DefaultLanePriority: {
		let lane = pickArbitraryLane(DefaultLanes & ~wipLanes);
		if (lane === NoLane) {
			// If all the default lanes are already being worked on, look for a
			// lane in the transition range.
			lane = pickArbitraryLane(TransitionLanes & ~wipLanes);
			if (lane === NoLane) {
				// All the transition lanes are taken, too. This should be very
				// rare, but as a last resort, pick a default lane. This will have
				// the effect of interrupting the current work-in-progress render.
				lane = pickArbitraryLane(DefaultLanes);
			}
		}
		return lane;
	}
	case TransitionPriority: // Should be handled by findTransitionLane instead
	case RetryLanePriority: // Should be handled by findRetryLane instead
		break;
	case IdleLanePriority:
		let lane = pickArbitraryLane(IdleLanes & ~wipLanes);
		if (lane === NoLane) {
			lane = pickArbitraryLane(IdleLanes);
		}
		return lane;
	default:
		// The remaining priorities are not valid for updates
		break;
	}
}


export function mergeLanes(a: Lanes | Lane, b: Lanes | Lane): Lanes {
	return a | b;
}