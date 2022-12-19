import { createUpdate, enqueueUpdate } from './ReactUpdateQueue';
import {
	requestEventTime,
	requestUpdateLane,
	scheduleUpdateOnFiber,
} from './ReactFiberWorkLoop';
import { createFiberRoot } from './ReactFiberRoot';
import type { Container } from '../../react-dom/src/ReactDOMHostConfig';
import type { FiberRoot } from './ReactInternalTypes';
import type { ReactNodeList } from '../../shared/src/ReactTypes';

type OpaqueRoot = FiberRoot;

export function updateContainer(
	element: ReactNodeList,
	container: OpaqueRoot,
	parentComponent?: any, // 源码中的 React$Component<any, any> 语法尚不清楚。。
	callback?: (() => any) | null,
) {
	const current = container.current;
	const eventTime = requestEventTime();
	// 计算本次更新的优先级
	const lane = requestUpdateLane();

	// 创建一个更新
	const update = createUpdate(eventTime, lane);
	update.payload = { element };
	callback = callback ?? null;
	if(callback) {
		update.callback = callback;
	}
	// 进行到这里，创建的 Update 的结构如下：
	// Update: {
	// 	lane: lane
	// 	payload: {
	// 		element: <App />         						----> 我们的应用 <App /> 在这里
	// 	},
	// 	callback: null
	// 	next: null
	// 	...
	// }

	// 将Update挂载到fiber上
	enqueueUpdate(current, update);

	// 进入reconciler运作流程中的输入环节
	scheduleUpdateOnFiber(current, lane, eventTime);

	return lane;
}

export function createContainer(containerInfo: Container): OpaqueRoot {
	return createFiberRoot(containerInfo);
}
