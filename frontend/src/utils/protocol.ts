// 内部协议
// kapok://${userName}@${userId}/${action}?${queryParameters}#${describe}
const DEFAULT_PROTOCOL = 'kapok';
class Protocol {
    uri: string;

    constructor(uri: string) {
        this.uri = uri;
    }

    /**
     * [通过参数名，获取url中的参数值]
     * 示例URL:kapok://${userName}@${userId}/${action}?${queryParameters}#${describe}
     * @param  {[string]} queryName [参数名]
     * @return {[string]}           [参数值]
     */
    getQueryValue(queryName:string) {
        const reg = new RegExp(`(^|&)${queryName}=([^&]*)(&|$)`, 'i'),
            r = window.location.search.substr(1).match(reg);
        if (r != null) {
            return decodeURI(r[2]);
        }
        return null;
    }

    run() {
        return `${this.uri} is running`;
    }
}

/**
 * 默认协议实例（无副作用）。
 * 保持模块在 import 时只暴露能力，不执行调试输出。
 */
const protocol = new Protocol(DEFAULT_PROTOCOL);

export { Protocol };
export default protocol;
