从零实现一个React框架，Concurrent模式 + Function组件 + Hooks，全中文的代码+内存状态注释
宏观包结构如下：
1. react：实现定义 react 组件( ReactElement 等)的必要函数
2. react-dom：实现 Concurrent 模式下的入口函数、与协调器的桥梁函数等
3. react-reconciler：实现接收渲染器输入函数、与调度器的桥梁函数、fiber构造函数等
4. scheduler：实现可中断渲染调度机制
