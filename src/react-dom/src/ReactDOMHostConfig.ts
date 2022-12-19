
import type {RootType} from './ReactDOMRoot';

export type Container =
  | (Element & {_reactRootContainer?: RootType,})
  | (Document & {_reactRootContainer?: RootType,});