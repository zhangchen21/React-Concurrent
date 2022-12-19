import { FiberRoot } from './ReactInternalTypes';
import {
	NoLanes,
	NoLanePriority,
	NoTimestamp,
	createLaneMap,
} from './ReactFiberLane';
import { createHostRootFiber } from './ReactFiber';
import { initializeUpdateQueue } from './ReactUpdateQueue';

export function createFiberRoot(containerInfo: any) {
	// 创建fiberRoot对象
	const root: FiberRoot= new FiberRootNode(containerInfo);

	// 创建`HostRootFiber`对象，也是React应用的首个fiber对象
	// 不需要传入 tag，我们只有 Concurrent 模式
	const uninitializedFiber = createHostRootFiber();
	root.current = uninitializedFiber;
	uninitializedFiber.stateNode = root;
	// 初始化HostRootFiber的updateQueue
	initializeUpdateQueue(uninitializedFiber);

	return root;
}

function FiberRootNode(containerInfo) {
	this.tag = 2; // 这是 ConcurrentRoot 的 tag，这里不作为参数传入
	this.containerInfo = containerInfo;
	this.pendingChildren = null;
	this.current = null;
	this.pingCache = null;
	this.finishedWork = null;
	this.context = null;
	this.pendingContext = null;
	this.callbackNode = null;
	this.callbackPriority = NoLanePriority;
	this.eventTimes = createLaneMap(NoLanes);
	this.expirationTimes = createLaneMap(NoTimestamp);

	this.pendingLanes = NoLanes;
	this.suspendedLanes = NoLanes;
	this.pingedLanes = NoLanes;
	this.expiredLanes = NoLanes;
	this.mutableReadLanes = NoLanes;
	this.finishedLanes = NoLanes;

	this.entangledLanes = NoLanes;
	this.entanglements = createLaneMap(NoLanes);
}