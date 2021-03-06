  class MVVM {
    constructor(options) {
        this.$data = options.data
        this.$methods = options.methods
        this.clientList = []
        this.$el = document.querySelector(options.el)
        this._proxy(this.$data)
        this.$fragment = this._node2Fragment(this.$el)
        this._compile(this.$fragment)
        this.$el.appendChild(this.$fragment)
      }
      _node2Fragment(el) {
        // 创建一个空的fragment对象
        const fragment = document.createDocumentFragment()
        let child;
        const div = document.createElement('div')
        div.innerHTML = el.innerHTML
        el.innerHTML = ''
        // 遍历取出所有的子元素添加到fragment中
        while (child = div.firstChild) {
            fragment.appendChild(child); //child会从el中转移到fragment中
        }
        return fragment;
      }
      /*
        判断是否是元素节点
      */
      isElementNode(node) {
          return node.nodeType == 1;
      }

      /*
        判断是否是文本节点
      */
      isTextNode(node) {
          return node.nodeType == 3;
      }

      // 代理data
      _proxy(data) {
        const _this = this
        // 暂存当前vm对象
        this.$data = new Proxy(data, {
            get: function proxyGetter(target,prop) {
                return target[prop];
            },
            set: function proxySetter(target,prop,value) {
                target[prop] = value;
                _this.clientList[prop] && _this.clientList[prop].map(item => {
                  item.update()
                })
                return true
            }
        })
    }

    /**
     * 添加订阅
     * **/
    _pushPubSub(watcher) {
        // 订阅事件
        if (!this.clientList[watcher.key]) {
            this.clientList[watcher.key] = [];
        }
        this.clientList[watcher.key].push(watcher);
    }

    // 绑定v-bind及其缩写
    _bindVBindAbbreviation(node, nodeName, nodeValue) {
        const data = this.$data
        const regBinds = /^(v-bind):\w+/
        if (regBinds.test(nodeName)) {
          // 添加订阅&渲染页面
          let attr = nodeName.split(':')[1]
          attr = attr === 'class' && 'className'
          this._render(node, attr, data, nodeValue, nodeName)
        } else {
          let attr = nodeName.slice(1)
          attr = attr === 'class' && 'className'
          // 添加订阅&渲染页面
          this._render(node, attr, data, nodeValue, nodeName)
        }
    }

    // 绑定事件
    _bindEvent(node, nodeName, nodeValue) {
          const data = this.$data
          const regEventOn = /^(v-on:)+\w+/
          const regEventAt = /^@\w+/
          const eventName = regEventOn.test(nodeName) ? nodeName.split(':')[1] : nodeName.slice(1)
          data[nodeValue] = this.$methods[nodeValue] 
          const method = this.$methods[nodeValue].bind(data)
          node.removeAttribute(nodeName)
          node.addEventListener(eventName, method)
    }

    // 绑定指令
    _bindDirective(node, nodeName, nodeValue) {
      const data = this.$data
      // 添加订阅&渲染页面
      this._render(node, 'innerHTML', data, nodeValue, nodeName)
    }

    // 绑定v-model
    _vModel(node, nodeValue) {
      const data = this.$data
      // 添加订阅&渲染页面
      this._render(node, 'value', data, nodeValue, 'v-model')
      node.addEventListener('input', () => {
        data[nodeValue] = node.value
      })
    }

    // 绑定文本
    _handlTextNodeMulti(node, nodeValue) {
      const data = this.$data
      const value = node.nodeValue
      // 添加订阅&渲染页面
      nodeValue.map(item => {
        this._render(node, 'nodeValue', data, item, null, this.textNode, value)
      })
    }

    /*
      替换{{xxx}}---{{yyy}}格式文本
    */
    textNode(nodeValue, data) {
      return nodeValue.replace(/{{\w+}}/g, word => {
          const text = word.match(/\w+/)[0]
          return data[text]
        }
      )
    }

    // 渲染&添加监视器
    _render(node, attr, data, key, directive, cb=null, nodeValue=null) {
      const watcher = new Watcher(node, attr, data, key, directive, cb, nodeValue)
      directive && watcher.removeAttr()
      watcher.update()
      this._pushPubSub(watcher)
    }

    /*
      指令解析器，对每个元素节点的指令进行扫描和解析，根据指令模板替换数据，以及绑定相对应的更新函数
    */
    _compile(root) {
      const nodes = Array.prototype.slice.call(root.childNodes)
      const data = this.$data
      const regBind = /^(v-bind)?:\w+/
      const regEvent = /^((v-on:)+\w+|@\w+)/
      const regDirective = /^(v-)+(html|text)/
      const regModel = /^(v-)+model/
      const _this = this
      nodes.map(node => {
        if (node.childNodes && node.childNodes.length) {
          this._compile(node)
        }
        const $input = node.nodeName.toLocaleUpperCase() === "INPUT";
        const $textarea = node.nodeName.toLocaleUpperCase() === "TEXTAREA";

        const attrList = []
        if (node.attributes) {
            for (let key in node.attributes) {
              const nodeName = node.attributes[key].nodeName
              const nodeValue = node.attributes[key].nodeValue
              attrList.push({nodeName, nodeValue, node})
          }
          attrList.map(item => {
            const {nodeName, nodeValue, node} = item
            const $bindAbbreviation = regBind.test(nodeName) // v-bind & :attr
            const $event = regEvent.test(nodeName) // v-on:event & @event
            const $directive = regDirective.test(nodeName) // v-html & v-text
            const $vmodel = regModel.test(nodeName) // v-model
            $bindAbbreviation && _this._bindVBindAbbreviation(node, nodeName, nodeValue)
            $event && _this._bindEvent(node, nodeName, nodeValue)
            $directive && _this._bindDirective(node, nodeName, nodeValue)
            // input || textarea && v-model
            if(($vmodel && $input) || ($vmodel && $textarea)) { _this._vModel(node, nodeValue) }
          })
        } else {
          const $isTextNode = _this.isTextNode(node)
          let nodeValue = node.nodeValue.match(/\w+/g)
          nodeValue && nodeValue.length && _this._handlTextNodeMulti(node, nodeValue)
        }
      })

    }
  }
  class Watcher {
    constructor(node, attr, data, key, directive, cb, nodeValue) {
      this.node = node
      this.attr = attr
      this.data = data
      this.key = key
      this.directive = directive
      this.cb = cb
      this.nodeValue = nodeValue
    }
    update() {
      if (this.cb) {
        const text = this.cb(this.nodeValue, this.data)
        this.node[this.attr] = text
        return
      }
      this.node[this.attr] = this.data[this.key]
    }
    removeAttr() {
      this.node.removeAttribute(this.directive)
    }
  }