import { updateContainer, createContainer } from '../../react-reconciler/src/ReactFiberReconciler';
import type { ReactNodeList } from '../../shared/src/ReactTypes';
import type { FiberRoot } from '../../react-reconciler/src/ReactInternalTypes';
import type { Container } from './ReactDOMHostConfig';
import {
	markContainerAsRoot,
	unmarkContainerAsRoot,
} from './ReactDOMComponentTree';

export type RootType = {  
  render(children: ReactNodeList): void,
  unmount(): void,
  _internalRoot: FiberRoot,
};

// 一切开始的地方
export function createRoot(container: Container): RootType {
	// 返回 ReactDOMRoot 实例
	return new ReactDOMRoot(container);
}
// 【递归地进行完 createRoot 操作后，再看以下注释】
// 此时生成了以下几个对象，这里只展示马上要用到的关键属性：
// ReactDOMRoot: {
// 	_internalRoot: FiberRoot   						----> 指向下面的 FiberRoot
// 	render()   						 								----> 等待执行的整个应用的入口函数
// 	unmount()
//	...
// }

// container: DOMElement {								----> 本质上就是getElementById得到的element，只加了个指向 fiber 的属性
//	id: 'root'
//	tagName: 'div'
//	...(DOMElement的属性和方法)
//	['__reactContainer$' + randomKey]: HostRootFiber				----> 指向下面的 fiber
// }

// FiberRoot: {
//	tag: 2																----> 此属性标识了模式：blocking/concurrent/legacy，固定为 2 -> concurrent
// 	containerInfo: container							----> 指向上面的的 container
// 	current: HostRootFiber    						----> 指向下面的 fiber
// 	...
// };

// HostRootFiber: {
// 	lanes: NoLanes
//	mode: 0b00111													----> 此属性标识了模式，固定为 0b00111-> concurrent，由上面的tag生成
//	tag: HostRoot(3)											----> 这是 WorkTag，标识fiber类型，和上面的tag没关系
// 	queue: {
// 		shared: {
// 			pending: null										  ----> 后续会挂载 Update 对象		
// 		},
// 		...
// 	}
// 	stateNode: FiberRoot    							----> 指向上面的 FiberRoot
// 	...
// }

// 构造函数
function ReactDOMRoot(container: Container) {
	// 创建一个fiberRoot对象, 并将其挂载到this._internalRoot之上
	this._internalRoot = craeteRootImpl(container);
}
ReactDOMRoot.prototype.render = function(children: ReactNodeList) {
	const root = this._internalRoot;
	// 应用启动的起点
	updateContainer(children, root, null, null);
};
ReactDOMRoot.prototype.unmount = function (): void {
	const root = this._internalRoot;
	const container = root.containerInfo;
	updateContainer(null, root, null, () => {
		unmarkContainerAsRoot(container);
	});
};

function craeteRootImpl(container: Container) {
	// 创建fiberRoot
	const root = createContainer(container);
	// 标记dom对象, 把dom和fiber对象关联起来
	// 具体操作就是把 container 的 '__reactContainer$' + randomKey 属性设置为 fiber 对象
	markContainerAsRoot(root.current, container);
	return root;
}
