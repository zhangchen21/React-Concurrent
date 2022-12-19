import { Fiber } from './ReactInternalTypes';
import { Lane } from './ReactFiberLane';

export type Update<State> = {
	eventTime: number,
	lane: Lane,

	tag: 0 | 1 | 2 | 3,
	// 对上一个状态prevState进行操作，
	// 1. 若 payload 是函数，则执行它：partialState = payload(prevState)；否则 partialState = payload；
	// 2. 若 partialState 为null，则直接返回；
	// 3. partialState 与 prevState 进行合并：assign({}, prevState, partialState)；
	payload: any,
	callback: (() => any) | null,

	next: Update<State> | null,
};

type SharedQueue<State> = {
	pending: Update<State> | null, // 这是一个循环链表, 而且指针指向到该链表的最后一个节点（特别注意）
};

// 这里的泛型
export type UpdateQueue<State> = {
	baseState: State, // 本次更新前该Fiber节点的state，此后的计算是基于该state计算更新后的state
	firstBaseUpdate: Update<State> | null, // 上次渲染时遗留下来的低优先级任务会组成一个链表，该字段指向到该链表的头节点
	// 若 firstBaseUpdate 为 null，说明这可能是第一次渲染，或者上次所有的任务的优先级都足够，全部执行了
	lastBaseUpdate: Update<State> | null, // 该字段指向到该链表的尾节点
	shared: SharedQueue<State>, // 本次渲染时要执行的任务，会存放在shared.pending中，这里是环形链表，更新时，会将其拆开，链接到 lastBaseUpdate 的后面
	effects: Array<Update<State>> | null, // 存放 update.callback 不为null的update
};

// 对应于 update 里面的 tag
export const UpdateState = 0;
export const ReplaceState = 1;
export const ForceUpdate = 2;
export const CaptureUpdate = 3;

// 给 fiber 节点增加 updateQueue 属性
export function initializeUpdateQueue<State>(fiber: Fiber): void {
	const queue: UpdateQueue<State> = {
		// 前一次更新计算得出的状态
		baseState: fiber.memoizedState,
		firstBaseUpdate: null,
		lastBaseUpdate: null,
		shared: {
			pending: null,
		},
		effects: null,
	};
	fiber.updateQueue = queue;
}

export function createUpdate<State>(eventTime: number, lane: Lane): Update<State> {
	const update: Update<State> = {
		eventTime,
		lane,

		tag: UpdateState,
		payload: null,
		callback: null,

		next: null,
	};
	return update;
}

// 将update添加到fiber的 updateQueue.shared.pending 中 
export function enqueueUpdate<State>(fiber: Fiber, update: Update<State>) {
	const updateQueue = fiber.updateQueue;
	if (updateQueue === null) {
		// 这只会出现在fiber已经被卸载的时候
		return;
	}

	const sharedQueue: SharedQueue<State> = updateQueue.shared;
	// pending是一个循环列表
	const pending = sharedQueue.pending;
	if (pending === null) {
		// 这是第一次更新，创建循环列表
		update.next = update;
	} else {
		// 当已经存在节点时，注意，pending指向的是最后一个节点，pending.next指向的才是第一个节点，
		// 这样指向的原因是可以方便的访问到last和first节点
		// 此时需要将 update 连接到这两个节点中间
		update.next = pending.next;
		pending.next = update;
	}
	// 此时 update 是最后一个结点了，将pending指向它
	sharedQueue.pending = update;
}