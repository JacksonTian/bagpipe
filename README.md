Bagpipe(风笛)
=======
You are the bagpiper.  

## 起源
在Node中我们可以十分方便利用异步和并行来提升我们的业务速度。但是，如果并发量过大，我们的服务器却可能吃不消，我们需要限制并发量。尽管`http`模块自身有[http.Agent](http://nodejs.org/docs/latest/api/http.html#http_class_http_agent)这样的玩意，用于控制socket的数量，但是通常我们的异步API早就封装好了。改动API的内部agent是不现实的，那么我们自己在逻辑层实现吧。

## 安装
```
npm install bagpipe
```

## API
`Bagpipe`暴露的API只有构造器和实例方法`push`。

在原始状态下，我们执行并发可能是如下这样的，这会形成100个并发异步调用。

```
for (var i = 0; i < 100; i++) {
  async(function () {
    // 异步调用
  });
}
```
如果需要限制并发，你的方案会是怎样？

`Bagpipe`的方案是如下这样的：

```
var Bagpipe = require('bagpipe');
// 设定最大并发数为10
var bagpipe = new Bagpipe(10);
for (var i = 0; i < 100; i++) {
  bagpipe.push(async, [], function () {
    // 异步调用
  });
}
```

是的，调用方式仅仅是将方法、参数、回调分拆一下通过`push`交给`bagpipe`即可。

这个方案与你预想的方案相比，如何？

## 原理
`Bagpipe`通过`push`将调用传入内部队列。如果活跃调用小于最大并发数，将会被取出直接执行，反之则继续呆在队列中。当一个异步调用结束的时候，会从队列前取出调用执行。以此来保证异步调用的活跃量不高于限定值。

## License
在[MIT](https://github.com/JacksonTian/bagpipe/blob/master/MIT-License)许可证下发布，欢迎享受开源

