import { HostRoot, WorkTag } from './ReactWorkTags';
import { NoFlags } from './ReactFiberFlags';
import { NoLanes } from './ReactFiberLane';

export function createHostRootFiber() {
	return createFiber(HostRoot, null, null);
}

const createFiber = function(
	tag: WorkTag,
	pendingProps: any,
	key: string | null,
) {
	return new FiberNode(tag, pendingProps, key);
};

function FiberNode(
	tag: WorkTag,
	pendingProps: any,
	key: string | null,
) {
	// Instance
	this.tag = tag;
	this.key = key;
	this.elementType = null;
	this.type = null;
	this.stateNode = null;

	// Fiber
	this.return = null;
	this.child = null;
	this.sibling = null;
	this.index = 0;

	this.ref = null;

	this.pendingProps = pendingProps;
	this.memoizedProps = null;
	this.updateQueue = null;
	this.memoizedState = null;
	this.dependencies = null;

	// mode 设置为 0b00111，而不作为参数传入
	this.mode = 0b00111;

	// Effects
	this.flags = NoFlags;
	this.subtreeFlags = NoFlags;
	this.deletions = null;

	this.lanes = NoLanes;
	this.childLanes = NoLanes;

	this.alternate = null;
}