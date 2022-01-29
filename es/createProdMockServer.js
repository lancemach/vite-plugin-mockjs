/*
 * @Author       : Lance Ma
 * @Date         : 2022-01-29 14:53:22
 * @LastEditors  : Lance Ma
 * @LastEditTime : 2022-01-29 15:01:34
 * @FilePath     : \es\createProdMockServer.js
 * @Descripttion : 
 */
/* eslint-disable */
import mockJs from 'mockjs'
import { pathToRegexp } from 'path-to-regexp'
const Mock = mockJs
export function createProdMockServer(mockList, delay) {
  Mock.XHR.prototype.__send = Mock.XHR.prototype.send
  Mock.XHR.prototype.send = function () {
    if (this.custom.xhr) {
      this.custom.xhr.withCredentials = this.withCredentials || false
      if (this.responseType) {
        this.custom.xhr.responseType = this.responseType
      }
    }
    if (this.custom.requestHeaders) {
      const headers = {}
      for (let k in this.custom.requestHeaders) {
        headers[k.toString().toLowerCase()] = this.custom.requestHeaders[k]
      }
      this.custom.options = Object.assign({}, this.custom.options, { headers })
    }
    this.__send.apply(this, arguments)
  }
  Mock.XHR.prototype.proxy_open = Mock.XHR.prototype.open
  Mock.XHR.prototype.open = function () {
    let responseType = this.responseType
    this.proxy_open(...arguments)
    if (this.custom.xhr) {
      if (responseType) {
        this.custom.xhr.responseType = responseType
      }
    }
  }
  for (const { url, method, response, timeout } of mockList) {
    let sleeptime = timeout ?? delay
    if (typeof sleeptime === 'string' && sleeptime.indexOf('-') !== -1) {
        const [min, max] = sleeptime.split('-') ?? [120, 800]
        sleeptime = parseInt(Math.random() * Number(max) + Number(min), 10)
    }
      console.log('MockProdServe timeout: ====> ', `${sleeptime}ms`, timeout, delay)
    __setupMock__(sleeptime);
    Mock.mock(
      pathToRegexp(url, undefined, { end: false }),
      method || 'get',
      __XHR2ExpressReqWrapper__(response),
    )
  }
}
function __param2Obj__(url) {
  const search = url.split('?')[1]
  if (!search) {
    return {}
  }
  return JSON.parse(
    '{"' +
      decodeURIComponent(search)
        .replace(/"/g, '\\"')
        .replace(/&/g, '","')
        .replace(/=/g, '":"')
        .replace(/\+/g, ' ') +
      '"}',
  )
}
function __XHR2ExpressReqWrapper__(handle) {
  return function (options) {
    let result = null
    if (typeof handle === 'function') {
      const { body, type, url, headers } = options
      result = handle({
        method: type,
        body: JSON.parse(body),
        query: __param2Obj__(url),
        headers,
      })
    } else {
      result = handle
    }
    return Mock.mock(result)
  }
}
function __setupMock__(timeout = 0) {
  timeout &&
    Mock.setup({
      timeout,
    })
}
