import { NoTimestamp, NoLanes, mergeLanes } from './ReactFiberLane';
import type { Lanes, Lane, } from './ReactFiberLane';
import {
	InputDiscreteLanePriority,
	schedulerPriorityToLanePriority,
	findUpdateLane
} from './ReactFiberLane';
import type { Fiber, FiberRoot } from './ReactInternalTypes';
import {
	getCurrentPriorityLevel,
	now,
	// 重命名，加入Scheduler字样以免混淆
	UserBlockingPriority as UserBlockingSchedulerPriority,
	ImmediatePriority as ImmediateSchedulerPriority,
} from './SchedulerWithReactIntegration';
import { HostRoot } from './ReactWorkTags';


type ExecutionContext = number;
export const NoContext = /*             */ 0b0000000;
const DiscreteEventContext = /*         */ 0b0000100;
const RenderContext = /*                */ 0b0010000;
const CommitContext = /*                */ 0b0100000;

// 在react执行栈中，标识当前处在什么执行环境
const executionContext: ExecutionContext = NoContext;

const workInProgressRootIncludedLanes: Lanes = NoLanes;

// 发起更新的时间
let currentEventTime: number = NoTimestamp;
let currentEventWipLanes: Lanes = NoLanes;

let rootsWithPendingDiscreteUpdates: Set<FiberRoot> | null = null;

// 返回当前时间戳
// RenderContext与CommitContext表示正在计算更新和正在提交更新，返回now()
// 如果是浏览器事件正在执行中，返回上一次的currentEventTime
// 如果终止或者中断react任务执行的时候，则重新获取执行时间now()
// 获取的时间越小，则执行的优先级越高
export function requestEventTime():number {
	if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
		return now();
	}
	if (currentEventTime !== NoTimestamp) {
		return currentEventTime;
	}
	currentEventTime = now();
	return currentEventTime;
}

// 这里源码是传入fiber的，因为要根据fiber的mode做不同的处理
// 我们因为只需要concurrent模式，因此不传参数
export function requestUpdateLane(): Lane {
	// workInProgressRootIncludedLanes是本次计算lane时之前已经存在的lane
	// 将之作为初始值，将使得新lane的位保持在已有lane位的左边，即优先级低于已有的lane
	if (currentEventWipLanes === NoLanes) {
		currentEventWipLanes = workInProgressRootIncludedLanes;
	}
	
	// 事件触发时，合成事件机制调用scheduler中的runWithPriority函数，目的是以该交互
	// 事件对应的事件优先级去派发真正的事件流程。runWithPriority会将事件优先级转化为
	// scheduler内部的优先级并记录下来
	// getCurrentPriorityLevel就是去获取scheduler中的优先级
	const schedulerPriority = getCurrentPriorityLevel();

	let lane;
	if (
		(executionContext & DiscreteEventContext) !== NoContext &&
		// 如果 scheduler 内部显示当前被用户操作中断了？
    schedulerPriority === UserBlockingSchedulerPriority
	) {
		// findUpdateLane计算lane，作为更新中的优先级
		lane = findUpdateLane(InputDiscreteLanePriority, currentEventWipLanes);
	} else {
		const schedulerLanePriority = schedulerPriorityToLanePriority(
			schedulerPriority,
		);

		lane = findUpdateLane(schedulerLanePriority, currentEventWipLanes);
	}

	return lane;
}

export function scheduleUpdateOnFiber(
	fiber: Fiber,
	lane: Lane,
	eventTime: number,
) {
	// 初次进入的逻辑就是直接返回了FiberRoot
	const root = markUpdateLaneFromFiberToRoot(fiber, lane);
	if (root === null) {
		return null;
	}

	// // Mark that the root has a pending update.
	// markRootUpdated(root, lane, eventTime);

	// 获取当前 scheduler 的优先级转化成的优先级等级
	const priorityLevel = getCurrentPriorityLevel();

	// 源码中对于不同的模式有不同的处理方式，我们只关注concurrent模式
	if (
		// 初次渲染时显然不会进入
		(executionContext & DiscreteEventContext) !== NoContext &&
			// 只考虑用户阻塞优先级或更高优先级的更新
			(priorityLevel === UserBlockingSchedulerPriority ||
				priorityLevel === ImmediateSchedulerPriority)
	) {
		// 跟踪最低优先级更新，以便我们可以在需要时尽早刷新它们。
		if (rootsWithPendingDiscreteUpdates === null) {
			rootsWithPendingDiscreteUpdates = new Set([root]);
		} else {
			rootsWithPendingDiscreteUpdates.add(root);
		}
	}
	
	// Schedule other updates after in case the callback is sync.
	ensureRootIsScheduled(root, eventTime);
	schedulePendingInteractions(root, lane);


	// We use this when assigning a lane for a transition inside
	// `requestUpdateLane`. We assume it's the same as the root being updated,
	// since in the common case of a single root app it probably is. If it's not
	// the same root, then it's not a huge deal, we just might batch more stuff
	// together more than necessary.
	mostRecentlyUpdatedRoot = root;
}

function markUpdateLaneFromFiberToRoot(
	sourceFiber: Fiber,
	lane: Lane,
): FiberRoot | null {
	//更新优先级，其实就是个 与 操作
	sourceFiber.lanes = mergeLanes(sourceFiber.lanes, lane);
	const alternate = sourceFiber.alternate;
	if (alternate !== null) {
		alternate.lanes = mergeLanes(alternate.lanes, lane);
	}
	const node = sourceFiber;
	// TODO
	// ...
	if (node.tag === HostRoot) {
		const root: FiberRoot = node.stateNode;
		// 初次进入，就是将FiberRoot返回了
		return root;
	} else {
		return null;
	}
}

// 使用此函数为根调度任务。每个根只有一个任务；如果已经安排了任务，我们将检查以确保现
// 有任务的优先级与根已处理的下一个级别的优先级相同。 这个函数在每次更新时调用，就在退出
// 任务之前调用
function ensureRootIsScheduled(root: FiberRoot, currentTime: number) {
	const existingCallbackNode = root.callbackNode;

	// Check if any lanes are being starved by other work. If so, mark them as
	// expired so we know to work on those next.
	markStarvedLanesAsExpired(root, currentTime);

	// Determine the next lanes to work on, and their priority.
	const nextLanes = getNextLanes(
		root,
		root === workInProgressRoot ? workInProgressRootRenderLanes : NoLanes,
	);
	// This returns the priority level computed during the `getNextLanes` call.
	const newCallbackPriority = returnNextLanesPriority();

	if (nextLanes === NoLanes) {
		// Special case: There's nothing to work on.
		if (existingCallbackNode !== null) {
			cancelCallback(existingCallbackNode);
			root.callbackNode = null;
			root.callbackPriority = NoLanePriority;
		}
		return;
	}

	// Check if there's an existing task. We may be able to reuse it.
	if (existingCallbackNode !== null) {
		const existingCallbackPriority = root.callbackPriority;
		if (existingCallbackPriority === newCallbackPriority) {
			// The priority hasn't changed. We can reuse the existing task. Exit.
			return;
		}
		// The priority changed. Cancel the existing callback. We'll schedule a new
		// one below.
		cancelCallback(existingCallbackNode);
	}

	// Schedule a new callback.
	let newCallbackNode;
	if (newCallbackPriority === SyncLanePriority) {
		// Special case: Sync React callbacks are scheduled on a special
		// internal queue
		newCallbackNode = scheduleSyncCallback(
			performSyncWorkOnRoot.bind(null, root),
		);
	} else if (newCallbackPriority === SyncBatchedLanePriority) {
		newCallbackNode = scheduleCallback(
			ImmediateSchedulerPriority,
			performSyncWorkOnRoot.bind(null, root),
		);
	} else {
		const schedulerPriorityLevel = lanePriorityToSchedulerPriority(
			newCallbackPriority,
		);
		newCallbackNode = scheduleCallback(
			schedulerPriorityLevel,
			performConcurrentWorkOnRoot.bind(null, root),
		);
	}

	root.callbackPriority = newCallbackPriority;
	root.callbackNode = newCallbackNode;
}