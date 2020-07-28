export default function Compile(root) {
    const nodes = Array.prototype.slice.call(root.childNodes)
    const data = this.$data
    const regBind = /^(v-bind)?:\w+/
    const regEvent = /^((v-on:)+\w+|@\w+)/
    const regDirective = /^(v-)+(html|text)/
    const _this = this
    nodes.map(node => {
      console.log(node.attributes, '<<<<<<<<<<<<<<<<<')
      if (node.childNodes && node.childNodes.length) {
        this._compile(node);
      }
      const $input = node.nodeName.toLocaleUpperCase() === "INPUT";
      const $textarea = node.nodeName.toLocaleUpperCase() === "TEXTAREA";
      const $vmodel = node.attributes && node.attributes.hasOwnProperty('v-model')

      if (node.attributes) {
          for (let key in node.attributes) {
            const nodeName = node.attributes[key].nodeName
            const nodeValue = node.attributes[key].nodeValue
            const $bindAbbreviation = regBind.test(nodeName) // v-bind & :attr
            const $event = regEvent.test(nodeName) // v-on:event & @event
            const $directive = regDirective.test(nodeName) // v-html & v-text
            $bindAbbreviation && _this._bindVBindAbbreviation(node, nodeName, nodeValue)
            $event && _this._bindEvent(node, nodeName, nodeValue)
            $directive && _this._bindDirective(node, nodeName, nodeValue)
        }
      }

      // 如果是input框 或 textarea 的话，并且带有 v-model 属性的
      if (($vmodel && $input) || ($vmodel && $textarea)) {
        const key = node.attributes['v-model'].nodeValue
        // 添加订阅&渲染页面
        this._render(node, 'value', data, key, 'v-model')
        node.addEventListener('input', () => {
          data[key] = node.value;
        })
      }
    })
  }