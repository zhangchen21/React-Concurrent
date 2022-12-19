import type { Fiber } from '../../react-reconciler/src/ReactInternalTypes';
import type { Container } from './ReactDOMHostConfig';

const randomKey = Math.random()
	.toString(36)
	.slice(2);
const internalContainerInstanceKey = '__reactContainer$' + randomKey;

export function markContainerAsRoot(hostRoot: Fiber, node: Container): void {
	node[internalContainerInstanceKey] = hostRoot;
}

export function unmarkContainerAsRoot(node: Container): void {
	node[internalContainerInstanceKey] = null;
}